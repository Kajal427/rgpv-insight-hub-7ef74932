const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RGPV_BASE = "http://result.rgpv.ac.in/Result";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: Array<{ code: string; grade: string }>;
};

// Extract cookies from response headers (works in Deno)
function getCookiesFromResponse(response: Response, existingCookies: string = ""): string {
  const cookieMap = new Map<string, string>();

  // Parse existing cookies
  if (existingCookies) {
    for (const part of existingCookies.split(";")) {
      const [k, ...v] = part.split("=");
      if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
    }
  }

  // Try getSetCookie first
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const [nameVal] = cookie.split(";");
    const [k, ...v] = nameVal.split("=");
    if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
  }

  // Also try raw set-cookie header (fallback)
  if (setCookies.length === 0) {
    const raw = response.headers.get("set-cookie");
    if (raw) {
      // May contain multiple cookies separated by comma (but date fields also have commas)
      // Split on patterns like ", NAME=" to handle this
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

// Follow redirects manually to capture cookies at each step
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
        // Consume body
        await resp.text();
        // Resolve relative URL
        currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
        // Switch to GET for redirect
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

// Extract ASP.NET hidden fields from HTML
function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldNames = ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"];

  for (const name of fieldNames) {
    const regex = new RegExp(`(?:id|name)="${name}"[^>]*value="([^"]*)"`, "i");
    const match = html.match(regex);
    if (match) fields[name] = match[1];
  }
  return fields;
}

// Extract CAPTCHA image URL
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

// Use AI to solve CAPTCHA
async function solveCaptcha(imageUrl: string, cookies: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const imgResponse = await fetch(imageUrl, {
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!imgResponse.ok) throw new Error(`Failed to download captcha: ${imgResponse.status}`);

  const imgBuffer = await imgResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
  const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";

  const aiResponse = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "This is a CAPTCHA image from a university website. Read the exact text/characters shown in this CAPTCHA image. Reply with ONLY the characters, nothing else. Characters may include uppercase letters and digits.",
          },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      }],
      max_tokens: 20,
      temperature: 0,
    }),
  });

  if (!aiResponse.ok) throw new Error(`AI failed: ${aiResponse.status}`);

  const aiData = await aiResponse.json();
  const raw = aiData.choices?.[0]?.message?.content?.trim() || "";
  // Keep original case - some captchas are case-sensitive
  const captchaText = raw.replace(/[^A-Za-z0-9]/g, "");
  console.log(`CAPTCHA solved: "${captchaText}" (raw: "${raw}")`);
  return captchaText;
}

// Parse result HTML
function parseResultHtml(html: string, enrollment: string): StudentResult | null {
  const result: StudentResult = {
    enrollment, name: "N/A", sgpa: "N/A", cgpa: "N/A", status: "N/A", subjects: [],
  };

  // Name patterns
  for (const p of [
    /lblNameGrading[^>]*>([^<]+)</i,
    /lblName[^>]*>([^<]+)</i,
    /lblStudentName[^>]*>([^<]+)</i,
    /Student\s*Name[^<]*<\/[^>]+>\s*<[^>]+>\s*([^<]+)/i,
  ]) {
    const m = html.match(p);
    if (m && m[1].trim().length > 1) { result.name = m[1].trim(); break; }
  }

  // SGPA
  for (const p of [/lblSGPA[^>]*>([0-9.]+)/i, /SGPA[^<]*<[^>]*>([0-9.]+)/i]) {
    const m = html.match(p);
    if (m) { result.sgpa = m[1].trim(); break; }
  }

  // CGPA
  for (const p of [/lblcgpa[^>]*>([0-9.]+)/i, /lblCGPA[^>]*>([0-9.]+)/i, /CGPA[^<]*<[^>]*>([0-9.]+)/i]) {
    const m = html.match(p);
    if (m) { result.cgpa = m[1].trim(); break; }
  }

  // Status
  for (const p of [/lblResultNewGrading[^>]*>([^<]+)/i, /lblResult[^>]*>([^<]+)/i]) {
    const m = html.match(p);
    if (m && m[1].trim().length > 0) { result.status = m[1].trim(); break; }
  }

  // Subjects - look for rows with subject codes and grades
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

  // Also try: subjects shown as "marks" format
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

// Fetch a single student result
async function fetchStudentResult(
  enrollment: string, semester: string, programId: string, maxAttempts = 5
): Promise<StudentResult> {
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const baseHeaders: Record<string, string> = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[${enrollment}] Attempt ${attempt + 1}/${maxAttempts}`);

      // Step 1: GET ProgramSelect.aspx (with manual redirect to capture cookies)
      const step1 = await fetchWithCookies(
        `${RGPV_BASE}/ProgramSelect.aspx`,
        { method: "GET", headers: baseHeaders },
        ""
      );
      console.log(`[${enrollment}] Step1 cookies: "${step1.cookies.substring(0, 100)}"`);

      const step1Fields = extractFormFields(step1.html);

      // Step 2: POST to select program
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

      console.log(`[${enrollment}] Step2 → ${step2.finalUrl}, cookies: "${step2.cookies.substring(0, 100)}", html: ${step2.html.length}`);

      const resultPageFields = extractFormFields(step2.html);

      // Find CAPTCHA
      const captchaUrl = extractCaptchaUrl(step2.html);
      console.log(`[${enrollment}] CAPTCHA: ${captchaUrl || "none"}`);

      if (!captchaUrl) {
        console.log(`[${enrollment}] No captcha found, skipping attempt`);
        continue;
      }

      // Solve captcha using same session cookies
      const captchaText = await solveCaptcha(captchaUrl, step2.cookies);
      if (!captchaText || captchaText.length < 3) {
        console.log(`[${enrollment}] CAPTCHA too short: "${captchaText}"`);
        continue;
      }

      // Step 3: Submit form
      const submitBody = new URLSearchParams();
      submitBody.set("__VIEWSTATE", resultPageFields.__VIEWSTATE || "");
      submitBody.set("__VIEWSTATEGENERATOR", resultPageFields.__VIEWSTATEGENERATOR || "");
      submitBody.set("__EVENTVALIDATION", resultPageFields.__EVENTVALIDATION || "");
      submitBody.set("__EVENTTARGET", "");
      submitBody.set("__EVENTARGUMENT", "");
      submitBody.set("ctl00$ContentPlaceHolder1$txtrollno", enrollment);
      submitBody.set("ctl00$ContentPlaceHolder1$drpSemester", semester);
      submitBody.set("ctl00$ContentPlaceHolder1$TextBox1", captchaText);
      submitBody.set("ctl00$ContentPlaceHolder1$btnviewresult", "View Result");

      const step3 = await fetchWithCookies(
        step2.finalUrl,
        {
          method: "POST",
          headers: { ...baseHeaders, "Content-Type": "application/x-www-form-urlencoded", "Origin": "http://result.rgpv.ac.in", "Referer": step2.finalUrl },
          body: submitBody.toString(),
        },
        step2.cookies
      );

      console.log(`[${enrollment}] Submit response: ${step3.html.length} chars`);

      // Check for alert errors
      const alertMatch = step3.html.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (alertMatch) {
        console.log(`[${enrollment}] Server error: "${alertMatch[1]}"`);
        continue;
      }

      // Parse result
      const parsed = parseResultHtml(step3.html, enrollment);
      if (parsed) {
        console.log(`[${enrollment}] ✅ ${parsed.name}, SGPA:${parsed.sgpa}, CGPA:${parsed.cgpa}, Status:${parsed.status}, Subjects:${parsed.subjects.length}`);
        return parsed;
      }

      // Log what we got
      const lbls = step3.html.match(/id="ctl00_ContentPlaceHolder1_[^"]+"/g);
      console.log(`[${enrollment}] No result parsed. ContentPlaceHolder IDs: ${lbls?.join(", ") || "none"}`);

    } catch (err) {
      console.error(`[${enrollment}] Error:`, err);
    }
  }

  return { enrollment, name: "Fetch Failed", sgpa: "N/A", cgpa: "N/A", status: "Error", subjects: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { enrollments, semester = "1", program = "B.Tech." } = await req.json();

    if (!enrollments || !Array.isArray(enrollments) || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No enrollment numbers provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const programIds: Record<string, string> = {
      "B.E.": "1", "B.Tech.": "24", "M.C.A.": "5", "B.Pharmacy": "2",
      "M.E.": "6", "M.Tech.": "8", "Diploma": "3", "M.B.A.": "4",
    };
    const programId = programIds[program] || "24";
    const limited = enrollments.slice(0, 50);

    console.log(`Processing ${limited.length} enrollments for ${program} (ID: ${programId}), Semester: ${semester}`);

    const results: StudentResult[] = [];
    for (const enrollment of limited) {
      try {
        const result = await fetchStudentResult(enrollment, semester, programId, 5);
        results.push(result);
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`Error fetching ${enrollment}:`, err);
        results.push({ enrollment, name: "Error", sgpa: "N/A", cgpa: "N/A", status: "Error", subjects: [] });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
