import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { results, program, semester } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!results || results.length === 0) {
      return new Response(JSON.stringify({ error: "No results provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validResults = results.filter((r: any) => r.sgpa !== "N/A" && r.name !== "Fetch Failed");
    const sgpas = validResults.map((r: any) => parseFloat(r.sgpa)).filter((n: number) => !isNaN(n));
    const cgpas = validResults.map((r: any) => parseFloat(r.cgpa)).filter((n: number) => !isNaN(n));
    
    const avg = sgpas.reduce((a: number, b: number) => a + b, 0) / sgpas.length;
    const passCount = validResults.filter((r: any) => r.status?.toLowerCase().includes("pass")).length;

    // Build per-student SGPA & subject detail for AI
    const studentDetails = validResults.map((r: any) => {
      const subjects = r.subjects?.map((s: any) => `${s.code}:${s.grade}`).join(", ") || "N/A";
      return `${r.name} | Enrollment: ${r.enrollment} | SGPA: ${r.sgpa} | CGPA: ${r.cgpa} | Status: ${r.status} | Subjects: [${subjects}]`;
    }).join("\n");

    // Subject-wise fail summary
    const subjectPerf: Record<string, { total: number; fails: number }> = {};
    validResults.forEach((r: any) => {
      r.subjects?.forEach((s: any) => {
        if (!subjectPerf[s.code]) subjectPerf[s.code] = { total: 0, fails: 0 };
        subjectPerf[s.code].total++;
        if (s.grade === "F") subjectPerf[s.code].fails++;
      });
    });

    const subjectSummary = Object.entries(subjectPerf)
      .map(([code, d]) => `${code}: ${d.total} students, ${d.fails} failed`)
      .join("; ");

    const systemPrompt = `You are an expert academic performance analyst for RGPV (Rajiv Gandhi Proudyogiki Vishwavidyalaya).

Your job: Analyze each student's SGPA, CGPA, and subject grades to PREDICT their next semester performance.

Rules:
- Use Hindi-English mixed language (Hinglish) that Indian faculty understand easily
- Be data-driven: reference actual SGPA/CGPA numbers
- For EACH student, give a short prediction line
- Use emoji for visual appeal

Structure your response EXACTLY like this:

## 📊 Class Overview
Brief 2-3 line summary with pass rate, avg SGPA

## 🔮 Student-wise Prediction (Next Semester)
For each student, one line:
- **Student Name** (SGPA: X.XX) → Predicted next SGPA: X.XX | Risk: 🟢Low/🟡Medium/🔴High | Remark

## ⚠️ At-Risk Students (Need Attention)
List students with SGPA < 5 or multiple F grades with specific subject concerns

## 🌟 Star Performers (Expected to Excel)  
Top performers with their strengths

## 📝 Subject-wise Insights
Which subjects had most failures, which were easy

## 💡 Faculty Recommendations
3-4 actionable points

Keep total response under 500 words. Be precise.`;

    const userPrompt = `Program: ${program || "B.Tech."} | Semester: ${semester || "N/A"}
Total: ${validResults.length} | Pass: ${passCount} | Fail: ${validResults.length - passCount} | Pass Rate: ${((passCount / validResults.length) * 100).toFixed(1)}%
Avg SGPA: ${avg.toFixed(2)} | Max: ${Math.max(...sgpas).toFixed(2)} | Min: ${Math.min(...sgpas).toFixed(2)}
${cgpas.length > 0 ? `Avg CGPA: ${(cgpas.reduce((a: number, b: number) => a + b, 0) / cgpas.length).toFixed(2)}` : ""}
Subject Summary: ${subjectSummary}

=== STUDENT DATA ===
${studentDetails}

Analyze each student's SGPA and grades. Predict their next semester SGPA and identify who needs help.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const prediction = data.choices?.[0]?.message?.content || "Unable to generate prediction.";

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("predict-results error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
