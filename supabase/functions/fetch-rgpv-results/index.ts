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

    // ACTION: solve-captcha — use AI to read captcha text from base64 image
    if (action === "solve-captcha") {
      const { captchaImage } = body;
      if (!captchaImage) {
        return new Response(
          JSON.stringify({ success: false, error: "No captchaImage provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "AI API key not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const aiResp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lovable.dev",
            "X-Title": "RGPV Result Fetcher",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: captchaImage },
                  },
                  {
                    type: "text",
                    text: "Read the CAPTCHA text in this image. Reply with ONLY the exact characters shown, nothing else. No spaces, no explanation.",
                  },
                ],
              },
            ],
            max_tokens: 20,
            temperature: 0,
          }),
        });

        const aiData = await aiResp.json();
        console.log(`[solve-captcha] AI response status: ${aiResp.status}, body: ${JSON.stringify(aiData).substring(0, 500)}`);
        const answer = aiData?.choices?.[0]?.message?.content?.trim() || "";
        console.log(`[solve-captcha] AI answer: "${answer}"`);

        if (!answer || answer.length > 10) {
          return new Response(
            JSON.stringify({ success: false, error: "AI could not read the CAPTCHA" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, answer }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.log(`[solve-captcha] Error: ${e}`);
        return new Response(
          JSON.stringify({ success: false, error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
