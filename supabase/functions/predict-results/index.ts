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

    // Prepare summary data for AI (don't send all raw data, summarize it)
    const validResults = results.filter((r: any) => r.sgpa !== "N/A" && r.name !== "Fetch Failed");
    const sgpas = validResults.map((r: any) => parseFloat(r.sgpa)).filter((n: number) => !isNaN(n));
    const cgpas = validResults.map((r: any) => parseFloat(r.cgpa)).filter((n: number) => !isNaN(n));
    
    const avg = sgpas.reduce((a: number, b: number) => a + b, 0) / sgpas.length;
    const passCount = validResults.filter((r: any) => r.status?.toLowerCase().includes("pass")).length;
    
    // Get subject-wise performance
    const subjectPerf: Record<string, { grades: string[] }> = {};
    validResults.forEach((r: any) => {
      r.subjects?.forEach((s: any) => {
        if (!subjectPerf[s.code]) subjectPerf[s.code] = { grades: [] };
        subjectPerf[s.code].grades.push(s.grade);
      });
    });

    const subjectSummary = Object.entries(subjectPerf).map(([code, data]) => {
      const grades = (data as any).grades as string[];
      const failCount = grades.filter((g: string) => g === "F").length;
      return `${code}: ${grades.length} students, ${failCount} failed`;
    }).join("; ");

    // Top 5 and bottom 5
    const sorted = [...validResults].sort((a: any, b: any) => parseFloat(b.sgpa) - parseFloat(a.sgpa));
    const top5 = sorted.slice(0, 5).map((r: any) => `${r.name} (SGPA: ${r.sgpa})`).join(", ");
    const bottom5 = sorted.slice(-5).map((r: any) => `${r.name} (SGPA: ${r.sgpa})`).join(", ");

    const systemPrompt = `You are an academic performance analyst for RGPV (Rajiv Gandhi Proudyogiki Vishwavidyalaya). 
Analyze the provided student performance data and give a prediction report in Hindi-English mixed language that faculty can understand easily.

Your response should be structured with these sections:
1. **📊 Overall Analysis** - Brief summary of class performance
2. **📈 Predicted Trends** - What the next semester might look like based on current data
3. **⚠️ At-Risk Students** - Students who might fail or perform poorly (based on low SGPA/grades)
4. **🌟 Star Performers** - Students likely to excel
5. **📝 Subject Insights** - Which subjects need more attention
6. **💡 Recommendations** - Actionable suggestions for faculty

Keep it concise, practical, and data-driven. Use bullet points. Max 400 words.`;

    const userPrompt = `Here is the data for ${program || "B.Tech."} Semester ${semester || "N/A"}:

- Total Students: ${validResults.length}
- Pass: ${passCount}, Fail: ${validResults.length - passCount}
- Pass Rate: ${((passCount / validResults.length) * 100).toFixed(1)}%
- Average SGPA: ${avg.toFixed(2)}, Max: ${Math.max(...sgpas).toFixed(2)}, Min: ${Math.min(...sgpas).toFixed(2)}
${cgpas.length > 0 ? `- Average CGPA: ${(cgpas.reduce((a: number, b: number) => a + b, 0) / cgpas.length).toFixed(2)}` : ""}
- Subject Performance: ${subjectSummary}
- Top 5: ${top5}
- Bottom 5: ${bottom5}

Analyze this data and predict future performance trends.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
