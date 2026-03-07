const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RGPV_BASE = "http://result.rgpv.ac.in/Result";

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: Array<{ code: string; grade: string }>;
};

function getCookiesFromResponse(response: Response, existingCookies: string = ""): string {
  const cookieMap = new Map<string, string>();
  if (existingCookies) {
    for (const part of existingCookies.split(";")) {
      const [k, ...v] = part.split("=");
      if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
    }
  }
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const [nameVal] = cookie.split(";");
    const [k, ...v] = nameVal.split("=");
    if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
  }
  if (setCookies.length === 0) {
    const raw = response.headers.get("set-cookie");
    if (raw) {
      const parts = raw.split(/,\s*(?=[A-Za-z_][A-Za-z0-9_]*=)/);
      for (const part of parts) {
        const [nameVal] = part.split(";");
        const [k, ...v] = nameVal.split("=");
        if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
      }
    }
  }
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchWithCookies(
  url: string,
  options: RequestInit & { headers: Record<string, string> },
  existingCookies: string
): Promise<{ response: Response; cookies: string; html: string; finalUrl: string }> {
  let cookies = existingCookies;
  let currentUrl = url;
  let maxRedirects = 5;
  while (maxRedirects-- > 0) {
    const resp = await fetch(currentUrl, {
      ...options,
      headers: { ...options.headers, "Cookie": cookies },
      redirect: "manual",
    });
    cookies = getCookiesFromResponse(resp, cookies);
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get("location");
      if (location) {
        await resp.text();
        currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
        if (options.method === "POST") {
          options = { ...options, method: "GET", body: undefined };
        }
        continue;
      }
    }
    const html = await resp.text();
    return { response: resp, cookies, html, finalUrl: currentUrl };
  }
  throw new Error("Too many redirects");
}

function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const name of ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"]) {
    const regex = new RegExp(`(?:id|name)="${name}"[^>]*value="([^"]*)"`, "i");
    const match = html.match(regex);
    if (match) fields[name] = match[1];
  }
  return fields;
}

function extractCaptchaUrl(html: string): string | null {
  const patterns = [
    /src="([^"]*CaptchaImage\.axd[^"]*)"/i,
    /src="([^"]*Captcha[^"]*)"/i,
    /id="ctl00_ContentPlaceHolder1_imgCaptcha"[^>]*src="([^"]*)"/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const src = match[1];
      if (src.startsWith("http")) return src;
      return `http://result.rgpv.ac.in${src.startsWith("/") ? "" : "/Result/"}${src}`;
    }
  }
  return null;
}

function parseResultHtml(html: string, enrollment: string): StudentResult | null {
  const result: StudentResult = {
    enrollment, name: "N/A", sgpa: "N/A", cgpa: "N/A", status: "N/A", subjects: [],
  };
  for (const p of [
    /lblNameGrading[^>]*>([^<]+)</i,
    /lblName[^>]*>([^<]+)</i,
    /lblStudentName[^>]*>([^<]+)</i,
    /Student\s*Name[^<]*<\/[^>]+>\s*<[^>]+>\s*([^<]+)/i,
  ]) {
    const m = html.match(p);
    if (m && m[1].trim().length > 1) { result.name = m[1].trim(); break; }
  }
  for (const p of [/lblSGPA[^>]*>([0-9.]+)/i, /SGPA[^<]*<[^>]*>([0-9.]+)/i]) {
    const m = html.match(p);
    if (m) { result.sgpa = m[1].trim(); break; }
  }
  for (const p of [/lblcgpa[^>]*>([0-9.]+)/i, /lblCGPA[^>]*>([0-9.]+)/i, /CGPA[^<]*<[^>]*>([0-9.]+)/i]) {
    const m = html.match(p);
    if (m) { result.cgpa = m[1].trim(); break; }
  }
  for (const p of [/lblResultNewGrading[^>]*>([^<]+)/i, /lblResult[^>]*>([^<]+)/i]) {
    const m = html.match(p);
    if (m && m[1].trim().length > 0) { result.status = m[1].trim(); break; }
  }
  const rowPattern = /<tr[^>]*>((?:(?!<\/tr>).)*?([A-Z]{2}\d{3,4}[A-Z]?)(?:(?!<\/tr>).)*?)<\/tr>/gis;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const row = rowMatch[1];
    const code = rowMatch[2];
    const gradeMatch = row.match(/<td[^>]*>\s*([A-F][+-]?|Ex|O)\s*<\/td>/i);
    if (gradeMatch) {
      result.subjects.push({ code: code.trim(), grade: gradeMatch[1].trim() });
    }
  }
  if (result.subjects.length === 0) {
    const subPattern = /([A-Z]{2}\d{3,4}[A-Z]?)[\s\S]*?(?:Total|Grade)\s*:?\s*(\d+|[A-F][+-]?)/gi;
    let subMatch;
    while ((subMatch = subPattern.exec(html)) !== null) {
      result.subjects.push({ code: subMatch[1], grade: subMatch[2] });
    }
  }
  if (result.name === "N/A" && result.sgpa === "N/A") return null;
  return result;
}

function extractAiText(aiData: any): string {
  const messageContent = aiData?.choices?.[0]?.message?.content;

  if (typeof messageContent === "string") return messageContent;

  if (Array.isArray(messageContent)) {
    const joined = messageContent
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .join(" ")
      .trim();
    if (joined) return joined;
  }

  if (typeof aiData?.output_text === "string") return aiData.output_text;
  if (typeof aiData?.choices?.[0]?.text === "string") return aiData.choices[0].text;

  return "";
}

const programIds: Record<string, string> = {
  "B.E.": "1", "B.Tech.": "24", "M.C.A.": "5", "B.Pharmacy": "2",
  "M.E.": "6", "M.Tech.": "8", "Diploma": "3", "M.B.A.": "4",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const baseHeaders: Record<string, string> = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  try {
    const body = await req.json();
    const { action } = body;

    // Helper: fetch with timeout
    const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
    };

    // ACTION: init — start session, navigate to result page, return captcha image as base64
    if (action === "init") {
      const { program = "B.Tech." } = body;
      const programId = programIds[program] || "24";

      // Step 1: GET ProgramSelect.aspx
      const step1 = await fetchWithCookies(
        `${RGPV_BASE}/ProgramSelect.aspx`,
        { method: "GET", headers: baseHeaders },
        ""
      );

      const step1Fields = extractFormFields(step1.html);

      // Step 2: POST to select program → redirects to result page
      const postBody = new URLSearchParams();
      postBody.set("__VIEWSTATE", step1Fields.__VIEWSTATE || "");
      postBody.set("__VIEWSTATEGENERATOR", step1Fields.__VIEWSTATEGENERATOR || "");
      postBody.set("__EVENTVALIDATION", step1Fields.__EVENTVALIDATION || "");
      postBody.set("__EVENTTARGET", "radlstProgram");
      postBody.set("__EVENTARGUMENT", "");
      postBody.set("radlstProgram", programId);

      const step2 = await fetchWithCookies(
        `${RGPV_BASE}/ProgramSelect.aspx`,
        {
          method: "POST",
          headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": `${RGPV_BASE}/ProgramSelect.aspx` },
          body: postBody.toString(),
        },
        step1.cookies
      );

      const formFields = extractFormFields(step2.html);
      const captchaUrl = extractCaptchaUrl(step2.html);

      if (!captchaUrl) {
        return new Response(
          JSON.stringify({ success: false, error: "No CAPTCHA found on page. The site may be down." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download captcha image using same session cookies
      const imgResp = await fetch(captchaUrl, {
        headers: { "Cookie": step2.cookies, "User-Agent": ua },
      });
      const imgBuffer = await imgResp.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      const mimeType = imgResp.headers.get("content-type") || "image/png";

      console.log(`[init] Session started. Captcha URL: ${captchaUrl}, cookies: ${step2.cookies.substring(0, 80)}`);

      return new Response(
        JSON.stringify({
          success: true,
          captchaImage: `data:${mimeType};base64,${base64}`,
          sessionData: {
            cookies: step2.cookies,
            formFields,
            resultPageUrl: step2.finalUrl,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: submit — submit form with user-provided captcha answer
    if (action === "submit") {
      const { enrollment, semester = "1", captchaAnswer, sessionData } = body;

      if (!enrollment || !captchaAnswer || !sessionData) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing enrollment, captchaAnswer, or sessionData" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { cookies, formFields, resultPageUrl } = sessionData;

      const submitBody = new URLSearchParams();
      submitBody.set("__VIEWSTATE", formFields.__VIEWSTATE || "");
      submitBody.set("__VIEWSTATEGENERATOR", formFields.__VIEWSTATEGENERATOR || "");
      submitBody.set("__EVENTVALIDATION", formFields.__EVENTVALIDATION || "");
      submitBody.set("__EVENTTARGET", "");
      submitBody.set("__EVENTARGUMENT", "");
      submitBody.set("ctl00$ContentPlaceHolder1$txtrollno", enrollment);
      submitBody.set("ctl00$ContentPlaceHolder1$drpSemester", semester);
      submitBody.set("ctl00$ContentPlaceHolder1$TextBox1", captchaAnswer);
      submitBody.set("ctl00$ContentPlaceHolder1$btnviewresult", "View Result");

      const step3 = await fetchWithCookies(
        resultPageUrl,
        {
          method: "POST",
          headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": resultPageUrl },
          body: submitBody.toString(),
        },
        cookies
      );

      console.log(`[submit] ${enrollment}: response ${step3.html.length} chars`);

      // Check for errors
      const alertMatch = step3.html.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (alertMatch) {
        console.log(`[submit] ${enrollment}: alert error: "${alertMatch[1]}"`);
        return new Response(
          JSON.stringify({ success: false, error: alertMatch[1], needsRetry: alertMatch[1].toLowerCase().includes("captcha") }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsed = parseResultHtml(step3.html, enrollment);
      if (parsed) {
        console.log(`[submit] ${enrollment}: ✅ ${parsed.name}, SGPA:${parsed.sgpa}`);

        // Extract new form fields + captcha for next student (same session)
        const newFields = extractFormFields(step3.html);
        const newCaptchaUrl = extractCaptchaUrl(step3.html);
        let newCaptchaImage: string | null = null;

        if (newCaptchaUrl) {
          try {
            const imgResp = await fetch(newCaptchaUrl, {
              headers: { "Cookie": step3.cookies, "User-Agent": ua },
            });
            const imgBuf = await imgResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
            const mime = imgResp.headers.get("content-type") || "image/png";
            newCaptchaImage = `data:${mime};base64,${b64}`;
          } catch (e) {
            console.log(`[submit] Failed to get next captcha: ${e}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            result: parsed,
            // Provide updated session for next student
            nextSession: newCaptchaImage ? {
              captchaImage: newCaptchaImage,
              sessionData: {
                cookies: step3.cookies,
                formFields: Object.keys(newFields).length > 0 ? newFields : formFields,
                resultPageUrl: step3.finalUrl,
              },
            } : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Could not parse result. Student may not have results for this semester.", needsRetry: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: auto-fetch — fully automated: init + AI solve + submit with retries
    if (action === "auto-fetch") {
      const { enrollment, semester = "1", program = "B.Tech.", sessionData: existingSession, captchaImage: existingCaptcha } = body;
      if (!enrollment) {
        return new Response(JSON.stringify({ success: false, error: "Missing enrollment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({ success: false, error: "AI API key not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const MAX_ATTEMPTS = 5;
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const MAX_RATE_LIMIT_BACKOFFS = 4;
      const AI_BASE_DELAY_MS = 400;
      const captchaModels = [
        "google/gemini-2.5-flash-lite",
        "google/gemini-2.5-flash",
        "google/gemini-2.5-pro",
      ];

      let session: { cookies: string; formFields: Record<string, string>; resultPageUrl: string } | null = existingSession || null;
      let captcha: string | null = existingCaptcha || null;
      // Preserve last known captcha/session for manual fallback
      let lastKnownCaptcha: string | null = existingCaptcha || null;
      let lastKnownSession: typeof session = existingSession || null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          // Step 1: Init session if needed
          if (!session || !captcha) {
            const programId = programIds[program] || "24";
            const step1 = await fetchWithCookies(`${RGPV_BASE}/ProgramSelect.aspx`, { method: "GET", headers: baseHeaders }, "");
            const step1Fields = extractFormFields(step1.html);
            const postBody = new URLSearchParams();
            postBody.set("__VIEWSTATE", step1Fields.__VIEWSTATE || "");
            postBody.set("__VIEWSTATEGENERATOR", step1Fields.__VIEWSTATEGENERATOR || "");
            postBody.set("__EVENTVALIDATION", step1Fields.__EVENTVALIDATION || "");
            postBody.set("__EVENTTARGET", "radlstProgram");
            postBody.set("__EVENTARGUMENT", "");
            postBody.set("radlstProgram", programId);
            const step2 = await fetchWithCookies(`${RGPV_BASE}/ProgramSelect.aspx`, {
              method: "POST",
              headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": `${RGPV_BASE}/ProgramSelect.aspx` },
              body: postBody.toString(),
            }, step1.cookies);

            const formFields = extractFormFields(step2.html);
            const captchaUrl = extractCaptchaUrl(step2.html);
            if (!captchaUrl) {
              return new Response(JSON.stringify({ success: false, error: "RGPV site may be down (no CAPTCHA found)" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const imgResp = await fetchWithTimeout(captchaUrl, { headers: { "Cookie": step2.cookies, "User-Agent": ua } }, 15000);
            const imgBuf = await imgResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)));
            const mime = imgResp.headers.get("content-type") || "image/png";
            captcha = `data:${mime};base64,${b64}`;
            session = { cookies: step2.cookies, formFields, resultPageUrl: step2.finalUrl };
            lastKnownCaptcha = captcha;
            lastKnownSession = session;
          }

          // Step 2: AI solve captcha (fallback models)
          let answer = "";
          let lastAiError = "";

          for (const model of captchaModels) {
            let rateLimitBackoffs = 0;

            while (rateLimitBackoffs <= MAX_RATE_LIMIT_BACKOFFS) {
              await wait(AI_BASE_DELAY_MS);

              const aiResp = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model,
                  messages: [{
                    role: "user",
                    content: [
                      { type: "image_url", image_url: { url: captcha } },
                      { type: "text", text: "Read this CAPTCHA and return ONLY the alphanumeric code. Output strictly uppercase letters and numbers only, no spaces, no punctuation, no explanation." },
                    ],
                  }],
                  max_tokens: 16,
                  temperature: 0,
                }),
              }, 30000);

              if (aiResp.status === 429) {
                rateLimitBackoffs += 1;
                const backoffMs = Math.min(20000, 3000 * (2 ** (rateLimitBackoffs - 1)));
                console.log(`[auto-fetch] ${enrollment} attempt ${attempt + 1}: AI rate limited on ${model}, waiting ${backoffMs}ms`);
                await wait(backoffMs);
                continue;
              }

              if (aiResp.status === 402) {
                return new Response(JSON.stringify({ success: false, error: "AI credits depleted" }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }

              if (!aiResp.ok) {
                lastAiError = `AI request failed (${aiResp.status})`;
                break;
              }

              const aiData = await aiResp.json();
              const rawText = extractAiText(aiData);
              const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");

              console.log(`[auto-fetch] ${enrollment} attempt ${attempt + 1}: model=${model}, raw="${rawText}", cleaned="${cleaned}"`);

              if (cleaned.length >= 4 && cleaned.length <= 8) {
                answer = cleaned;
              }
              break;
            }

            if (answer) break;
          }

          if (!answer) {
            console.log(`[auto-fetch] ${enrollment} attempt ${attempt + 1}: no valid AI answer. ${lastAiError}`);
            session = null;
            captcha = null;
            await wait(300);
            continue;
          }

          // Step 3: Submit
          const submitBody = new URLSearchParams();
          submitBody.set("__VIEWSTATE", session.formFields.__VIEWSTATE || "");
          submitBody.set("__VIEWSTATEGENERATOR", session.formFields.__VIEWSTATEGENERATOR || "");
          submitBody.set("__EVENTVALIDATION", session.formFields.__EVENTVALIDATION || "");
          submitBody.set("__EVENTTARGET", "");
          submitBody.set("__EVENTARGUMENT", "");
          submitBody.set("ctl00$ContentPlaceHolder1$txtrollno", enrollment);
          submitBody.set("ctl00$ContentPlaceHolder1$drpSemester", semester);
          submitBody.set("ctl00$ContentPlaceHolder1$TextBox1", answer);
          submitBody.set("ctl00$ContentPlaceHolder1$btnviewresult", "View Result");

          const step3 = await fetchWithCookies(session.resultPageUrl, {
            method: "POST",
            headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": session.resultPageUrl },
            body: submitBody.toString(),
          }, session.cookies);

          const alertMatch = step3.html.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
          if (alertMatch) {
            const alertText = alertMatch[1].toLowerCase();

            // Retry on captcha/wrong-text errors by using refreshed captcha from same page when possible
            if (alertText.includes("captcha") || alertText.includes("wrong") || alertText.includes("invalid") || alertText.includes("incorrect")) {
              console.log(`[auto-fetch] ${enrollment} attempt ${attempt + 1}: wrong captcha ("${alertMatch[1]}"), retrying...`);

              const retryFields = extractFormFields(step3.html);
              const retryCaptchaUrl = extractCaptchaUrl(step3.html);

              if (retryCaptchaUrl) {
                try {
                  const retryImgResp = await fetchWithTimeout(retryCaptchaUrl, { headers: { "Cookie": step3.cookies, "User-Agent": ua } }, 15000);
                  const retryImgBuf = await retryImgResp.arrayBuffer();
                  const retryB64 = btoa(String.fromCharCode(...new Uint8Array(retryImgBuf)));
                  const retryMime = retryImgResp.headers.get("content-type") || "image/png";
                  captcha = `data:${retryMime};base64,${retryB64}`;
                  session = {
                    cookies: step3.cookies,
                    formFields: Object.keys(retryFields).length > 0 ? retryFields : session.formFields,
                    resultPageUrl: step3.finalUrl,
                  };
                  lastKnownCaptcha = captcha;
                  lastKnownSession = session;
                  await wait(300);
                  continue;
                } catch {
                  // fallback to full re-init below
                }
              }

              session = null;
              captcha = null;
              await wait(300);
              continue;
            }

            return new Response(JSON.stringify({ success: false, error: alertMatch[1] }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          const parsed = parseResultHtml(step3.html, enrollment);
          if (parsed) {
            console.log(`[auto-fetch] ${enrollment}: ✅ ${parsed.name}, SGPA:${parsed.sgpa}`);

            // Get next session for chaining
            const newFields = extractFormFields(step3.html);
            const newCaptchaUrl = extractCaptchaUrl(step3.html);
            let nextSession: { captchaImage: string; sessionData: { cookies: string; formFields: Record<string, string>; resultPageUrl: string } } | null = null;

            if (newCaptchaUrl) {
              try {
                const imgResp2 = await fetchWithTimeout(newCaptchaUrl, { headers: { "Cookie": step3.cookies, "User-Agent": ua } }, 15000);
                const imgBuf2 = await imgResp2.arrayBuffer();
                const b642 = btoa(String.fromCharCode(...new Uint8Array(imgBuf2)));
                const mime2 = imgResp2.headers.get("content-type") || "image/png";
                nextSession = {
                  captchaImage: `data:${mime2};base64,${b642}`,
                  sessionData: {
                    cookies: step3.cookies,
                    formFields: Object.keys(newFields).length > 0 ? newFields : session.formFields,
                    resultPageUrl: step3.finalUrl,
                  },
                };
              } catch (_) {
                // no-op
              }
            }

            return new Response(JSON.stringify({ success: true, result: parsed, nextSession }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          // If parse failed, refresh and retry instead of failing immediately
          session = null;
          captcha = null;
          await wait(300);

        } catch (e) {
          console.log(`[auto-fetch] ${enrollment} attempt ${attempt + 1} error: ${e}`);
          session = null;
          captcha = null;

          if (attempt === MAX_ATTEMPTS - 1) {
            return new Response(JSON.stringify({ success: false, error: `Failed after ${MAX_ATTEMPTS} attempts: ${e instanceof Error ? e.message : "Unknown"}` }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          await wait(300);
        }
      }

      // Return last known captcha image + session for manual fallback
      // If we don't have one, try to init a fresh session for manual entry
      let fallbackCaptcha = lastKnownCaptcha;
      let fallbackSession = lastKnownSession;
      if (!fallbackCaptcha || !fallbackSession) {
        try {
          const programId = programIds[program] || "24";
          const s1 = await fetchWithCookies(`${RGPV_BASE}/ProgramSelect.aspx`, { method: "GET", headers: baseHeaders }, "");
          const s1f = extractFormFields(s1.html);
          const pb = new URLSearchParams();
          pb.set("__VIEWSTATE", s1f.__VIEWSTATE || "");
          pb.set("__VIEWSTATEGENERATOR", s1f.__VIEWSTATEGENERATOR || "");
          pb.set("__EVENTVALIDATION", s1f.__EVENTVALIDATION || "");
          pb.set("__EVENTTARGET", "radlstProgram");
          pb.set("__EVENTARGUMENT", "");
          pb.set("radlstProgram", programId);
          const s2 = await fetchWithCookies(`${RGPV_BASE}/ProgramSelect.aspx`, {
            method: "POST",
            headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": `${RGPV_BASE}/ProgramSelect.aspx` },
            body: pb.toString(),
          }, s1.cookies);
          const ff = extractFormFields(s2.html);
          const cu = extractCaptchaUrl(s2.html);
          if (cu) {
            const ir = await fetchWithTimeout(cu, { headers: { "Cookie": s2.cookies, "User-Agent": ua } }, 15000);
            const ib = await ir.arrayBuffer();
            const b = btoa(String.fromCharCode(...new Uint8Array(ib)));
            const m = ir.headers.get("content-type") || "image/png";
            fallbackCaptcha = `data:${m};base64,${b}`;
            fallbackSession = { cookies: s2.cookies, formFields: ff, resultPageUrl: s2.finalUrl };
          }
        } catch (e) {
          console.log(`[auto-fetch] ${enrollment}: failed to get fallback captcha: ${e}`);
        }
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed after ${MAX_ATTEMPTS} attempts`,
        captchaImage: fallbackCaptcha,
        sessionData: fallbackSession,
      }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'init', 'submit', or 'solve-captcha'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = msg.includes("timed out") || msg.includes("aborted") || msg.includes("Connection") || msg.includes("ECONNREFUSED");
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: isTimeout 
          ? "RGPV server is currently unreachable. Please wait a moment and try again." 
          : msg,
        needsRetry: isTimeout,
      }),
      { status: isTimeout ? 503 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
