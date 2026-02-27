const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RGPV_BASE = "http://result.rgpv.ac.in/Result";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Program IDs mapping
const PROGRAM_IDS: Record<string, string> = {
  "B.E.": "1", "B.Tech.": "24", "M.C.A.": "5", "B.Pharmacy": "2",
  "M.E.": "6", "M.Tech.": "8", "Diploma": "3", "M.B.A.": "4",
};

// Result page URLs for each program
const PROGRAM_PAGES: Record<string, string> = {
  "1": "BEIcar.aspx", "24": "BtechIcar.aspx", "5": "MCAgrading.aspx",
  "2": "BpharmIcar.aspx", "6": "MEgrading.aspx", "8": "MtechGrading.aspx",
  "3": "DiplomaIcar.aspx", "4": "MBAgrading.aspx",
};

type StudentResult = {
  enrollment: string;
  name: string;
  sgpa: string;
  cgpa: string;
  status: string;
  subjects: Array<{ code: string; grade: string }>;
};

// Extract ASP.NET hidden fields from HTML
function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldNames = ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION", "__EVENTTARGET", "__EVENTARGUMENT"];
  
  for (const name of fieldNames) {
    const regex = new RegExp(`id="${name}"[^>]*value="([^"]*)"`, "i");
    const match = html.match(regex);
    if (match) {
      fields[name] = match[1];
    }
  }
  return fields;
}

// Extract CAPTCHA image URL from HTML
function extractCaptchaUrl(html: string): string | null {
  const match = html.match(/id="ctl00_ContentPlaceHolder1_imgCaptcha"[^>]*src="([^"]*)"/i);
  if (match) {
    const src = match[1];
    if (src.startsWith("http")) return src;
    return `${RGPV_BASE}/${src}`;
  }
  return null;
}

// Use AI to solve CAPTCHA
async function solveCaptcha(imageUrl: string, cookies: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  // Download captcha image
  const imgResponse = await fetch(imageUrl, {
    headers: {
      "Cookie": cookies,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": `${RGPV_BASE}/BtechIcar.aspx`,
    },
  });

  if (!imgResponse.ok) throw new Error(`Failed to download captcha: ${imgResponse.status}`);

  const imgBuffer = await imgResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
  const mimeType = imgResponse.headers.get("content-type") || "image/jpeg";

  // Use Gemini to solve captcha
  const aiResponse = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read the CAPTCHA text from this image. Return ONLY the exact characters shown, nothing else. The captcha contains uppercase letters and/or numbers. No spaces, no explanation.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 20,
      temperature: 0,
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    throw new Error(`AI captcha solve failed: ${aiResponse.status} - ${errText}`);
  }

  const aiData = await aiResponse.json();
  const captchaText = aiData.choices?.[0]?.message?.content?.trim()?.replace(/[^A-Z0-9]/gi, "").toUpperCase() || "";
  console.log(`AI CAPTCHA solution: ${captchaText}`);
  return captchaText;
}

// Extract result data from HTML
function parseResultHtml(html: string, enrollment: string): StudentResult | null {
  const result: StudentResult = {
    enrollment,
    name: "N/A",
    sgpa: "N/A",
    cgpa: "N/A",
    status: "N/A",
    subjects: [],
  };

  // Extract name
  const nameMatch = html.match(/lblNameGrading[^>]*>([^<]+)</i) || html.match(/lblName[^>]*>([^<]+)</i);
  if (nameMatch) result.name = nameMatch[1].trim();

  // Extract SGPA
  const sgpaMatch = html.match(/lblSGPA[^>]*>([^<]+)</i);
  if (sgpaMatch) result.sgpa = sgpaMatch[1].trim();

  // Extract CGPA
  const cgpaMatch = html.match(/lblcgpa[^>]*>([^<]+)</i) || html.match(/lblCGPA[^>]*>([^<]+)</i);
  if (cgpaMatch) result.cgpa = cgpaMatch[1].trim();

  // Extract result status
  const resultMatch = html.match(/lblResultNewGrading[^>]*>([^<]+)</i) || html.match(/lblResult[^>]*>([^<]+)</i);
  if (resultMatch) result.status = resultMatch[1].trim();

  // Extract subject grades from tables
  // Pattern: subject code and grade in table rows
  const subjectPattern = /([A-Z]{2}\d{3}(?:[A-Z])?(?:\s*-\s*\[[TP]\])?)\s*<\/td>.*?<td[^>]*>([A-F][+-]?)<\/td>/gis;
  let subMatch;
  while ((subMatch = subjectPattern.exec(html)) !== null) {
    result.subjects.push({
      code: subMatch[1].trim(),
      grade: subMatch[2].trim(),
    });
  }

  // Alternative: extract from grading panel tables
  if (result.subjects.length === 0) {
    const tablePattern = /pnlGrading.*?<table[^>]*>(.*?)<\/table>/gis;
    let tableMatch;
    while ((tableMatch = tablePattern.exec(html)) !== null) {
      const codeMatch = tableMatch[1].match(/<td[^>]*>([A-Z]{2}\d{3}[A-Z]?)/i);
      const gradeMatch = tableMatch[1].match(/<td[^>]*>\s*([A-F][+-]?)\s*<\/td>\s*$/i);
      if (codeMatch && gradeMatch) {
        result.subjects.push({
          code: codeMatch[1].trim(),
          grade: gradeMatch[1].trim(),
        });
      }
    }
  }

  // Check if we got meaningful data
  if (result.name === "N/A" && result.sgpa === "N/A") {
    return null;
  }

  return result;
}

// Manage cookies from responses
function extractCookies(response: Response, existingCookies: string): string {
  const setCookies = response.headers.getSetCookie?.() || [];
  const cookieMap = new Map<string, string>();
  
  // Parse existing cookies
  if (existingCookies) {
    for (const part of existingCookies.split(";")) {
      const [k, ...v] = part.split("=");
      if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
    }
  }
  
  // Parse new cookies
  for (const cookie of setCookies) {
    const [nameVal] = cookie.split(";");
    const [k, ...v] = nameVal.split("=");
    if (k?.trim()) cookieMap.set(k.trim(), v.join("="));
  }
  
  return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

// Fetch a single student result
async function fetchStudentResult(
  enrollment: string,
  semester: string,
  programId: string,
  maxAttempts: number = 3
): Promise<StudentResult> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "http://result.rgpv.ac.in",
  };

  const resultPage = PROGRAM_PAGES[programId] || "BtechIcar.aspx";
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[${enrollment}] Attempt ${attempt + 1}/${maxAttempts}`);
      
      // Step 1: GET ProgramSelect.aspx to get initial ViewState + cookies
      const step1Resp = await fetch(`${RGPV_BASE}/ProgramSelect.aspx`, {
        headers: { "User-Agent": headers["User-Agent"] },
        redirect: "follow",
      });
      
      if (!step1Resp.ok) throw new Error(`Step 1 failed: ${step1Resp.status}`);
      
      let cookies = extractCookies(step1Resp, "");
      const step1Html = await step1Resp.text();
      const step1Fields = extractFormFields(step1Html);
      
      console.log(`[${enrollment}] Got ProgramSelect page, ViewState length: ${step1Fields.__VIEWSTATE?.length || 0}`);
      
      // Step 2: POST to select B.Tech program
      const postBody = new URLSearchParams();
      postBody.set("__VIEWSTATE", step1Fields.__VIEWSTATE || "");
      postBody.set("__VIEWSTATEGENERATOR", step1Fields.__VIEWSTATEGENERATOR || "");
      postBody.set("__EVENTVALIDATION", step1Fields.__EVENTVALIDATION || "");
      postBody.set("__EVENTTARGET", "radlstProgram");
      postBody.set("__EVENTARGUMENT", "");
      postBody.set("radlstProgram", programId);
      
      const step2Resp = await fetch(`${RGPV_BASE}/ProgramSelect.aspx`, {
        method: "POST",
        headers: { ...headers, "Cookie": cookies, "Referer": `${RGPV_BASE}/ProgramSelect.aspx` },
        body: postBody.toString(),
        redirect: "follow",
      });
      
      cookies = extractCookies(step2Resp, cookies);
      const step2Html = await step2Resp.text();
      
      // Check if we got redirected to the result entry page
      const hasEnrollField = step2Html.includes("txtrollno") || step2Html.includes("TextBox1");
      console.log(`[${enrollment}] Step 2: hasEnrollField=${hasEnrollField}, url=${step2Resp.url}`);
      
      let resultPageHtml = step2Html;
      
      // If not redirected, try direct GET
      if (!hasEnrollField) {
        const directResp = await fetch(`${RGPV_BASE}/${resultPage}`, {
          headers: { ...headers, "Cookie": cookies, "Referer": `${RGPV_BASE}/ProgramSelect.aspx` },
          redirect: "follow",
        });
        cookies = extractCookies(directResp, cookies);
        resultPageHtml = await directResp.text();
      }
      
      const step2Fields = extractFormFields(resultPageHtml);
      
      // Step 3: Download and solve CAPTCHA
      const captchaUrl = extractCaptchaUrl(resultPageHtml);
      if (!captchaUrl) {
        console.log(`[${enrollment}] No CAPTCHA found, trying without it`);
      }
      
      let captchaText = "";
      if (captchaUrl) {
        captchaText = await solveCaptcha(captchaUrl, cookies);
        if (!captchaText || captchaText.length < 3) {
          console.log(`[${enrollment}] CAPTCHA solution too short: "${captchaText}", retrying...`);
          continue;
        }
      }
      
      // Step 4: Submit the form with enrollment + semester + captcha
      const submitBody = new URLSearchParams();
      submitBody.set("__VIEWSTATE", step2Fields.__VIEWSTATE || "");
      submitBody.set("__VIEWSTATEGENERATOR", step2Fields.__VIEWSTATEGENERATOR || "");
      submitBody.set("__EVENTVALIDATION", step2Fields.__EVENTVALIDATION || "");
      submitBody.set("__EVENTTARGET", "");
      submitBody.set("__EVENTARGUMENT", "");
      submitBody.set("ctl00$ContentPlaceHolder1$txtrollno", enrollment);
      submitBody.set("ctl00$ContentPlaceHolder1$drpSemester", semester);
      submitBody.set("ctl00$ContentPlaceHolder1$TextBox1", captchaText);
      submitBody.set("ctl00$ContentPlaceHolder1$btnviewresult", "View Result");
      
      const submitResp = await fetch(`${RGPV_BASE}/${resultPage}`, {
        method: "POST",
        headers: { ...headers, "Cookie": cookies, "Referer": `${RGPV_BASE}/${resultPage}` },
        body: submitBody.toString(),
        redirect: "follow",
      });
      
      const submitHtml = await submitResp.text();
      
      // Check for error/invalid captcha indicators
      if (submitHtml.includes("Invalid") || submitHtml.includes("Wrong Captcha") || submitHtml.includes("alert(")) {
        console.log(`[${enrollment}] Invalid CAPTCHA or error, retrying...`);
        continue;
      }
      
      // Parse result
      const parsedResult = parseResultHtml(submitHtml, enrollment);
      if (parsedResult) {
        console.log(`[${enrollment}] ✅ Got result: ${parsedResult.name}, SGPA: ${parsedResult.sgpa}`);
        return parsedResult;
      }
      
      console.log(`[${enrollment}] Could not parse result from response`);
      
    } catch (err) {
      console.error(`[${enrollment}] Attempt ${attempt + 1} error:`, err);
    }
  }
  
  // Return failed result
  return {
    enrollment,
    name: "Fetch Failed",
    sgpa: "N/A",
    cgpa: "N/A",
    status: "Error",
    subjects: [],
  };
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

    const programId = PROGRAM_IDS[program] || "24";
    const limited = enrollments.slice(0, 50);
    const results: StudentResult[] = [];

    console.log(`Processing ${limited.length} enrollments for ${program} (ID: ${programId}), Semester: ${semester}`);

    // Process sequentially to maintain session state and avoid rate limiting
    for (const enrollment of limited) {
      try {
        const result = await fetchStudentResult(enrollment, semester, programId, 3);
        results.push(result);
        
        // Small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Error fetching ${enrollment}:`, err);
        results.push({
          enrollment,
          name: "Error",
          sgpa: "N/A",
          cgpa: "N/A",
          status: "Error",
          subjects: [],
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Edge function error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
