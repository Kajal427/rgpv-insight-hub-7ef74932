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
    const aiAvailable = !!LOVABLE_API_KEY;

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
- Use clear, professional English
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

    // Helper: generate offline stats-based prediction
    const generateLocalPrediction = () => {
      const passRate = ((passCount / validResults.length) * 100).toFixed(1);
      const avgSGPA = avg.toFixed(2);
      const maxSGPA = Math.max(...sgpas).toFixed(2);
      const minSGPA = Math.min(...sgpas).toFixed(2);
      const avgCGPA = cgpas.length > 0 ? (cgpas.reduce((a: number, b: number) => a + b, 0) / cgpas.length).toFixed(2) : "N/A";

      const atRisk = validResults.filter((r: any) => {
        const s = parseFloat(r.sgpa);
        return !isNaN(s) && s < 5;
      });
      const stars = validResults.filter((r: any) => {
        const s = parseFloat(r.sgpa);
        return !isNaN(s) && s >= 8;
      });

      const hardSubjects = Object.entries(subjectPerf)
        .filter(([, d]) => d.fails > 0)
        .sort((a, b) => b[1].fails - a[1].fails)
        .slice(0, 5);

      let prediction = `## 📊 Class Overview\n`;
      prediction += `Total Students: **${validResults.length}** | Pass: **${passCount}** | Fail: **${validResults.length - passCount}** | Pass Rate: **${passRate}%**\n`;
      prediction += `Average SGPA: **${avgSGPA}** | Max: **${maxSGPA}** | Min: **${minSGPA}** | Avg CGPA: **${avgCGPA}**\n\n`;

      prediction += `## 🔮 Student-wise Prediction (Next Semester)\n`;
      validResults.forEach((r: any) => {
        const s = parseFloat(r.sgpa);
        const failCount = r.subjects?.filter((sub: any) => sub.grade === "F").length || 0;
        let risk = "🟢 Low";
        let predictedSGPA = s;
        if (isNaN(s)) { risk = "🟡 Medium"; }
        else if (s < 4 || failCount >= 3) { risk = "🔴 High"; predictedSGPA = Math.min(s + 0.3, 10); }
        else if (s < 6 || failCount >= 1) { risk = "🟡 Medium"; predictedSGPA = Math.min(s + 0.2, 10); }
        else { predictedSGPA = Math.max(s - 0.1, s * 0.98); }
        prediction += `- **${r.name}** (SGPA: ${r.sgpa}) → Predicted: ${predictedSGPA.toFixed(2)} | Risk: ${risk} | ${failCount > 0 ? `${failCount} backlogs` : "On track"}\n`;
      });

      if (atRisk.length > 0) {
        prediction += `\n## ⚠️ At-Risk Students (Need Attention)\n`;
        atRisk.forEach((r: any) => {
          const fails = r.subjects?.filter((sub: any) => sub.grade === "F").map((sub: any) => sub.code).join(", ") || "None";
          prediction += `- **${r.name}** — SGPA: ${r.sgpa} | Failed: ${fails}\n`;
        });
      }

      if (stars.length > 0) {
        prediction += `\n## 🌟 Star Performers\n`;
        stars.forEach((r: any) => {
          prediction += `- **${r.name}** — SGPA: ${r.sgpa} | CGPA: ${r.cgpa}\n`;
        });
      }

      if (hardSubjects.length > 0) {
        prediction += `\n## 📝 Subject-wise Insights\n`;
        hardSubjects.forEach(([code, d]) => {
          const failPct = ((d.fails / d.total) * 100).toFixed(0);
          prediction += `- **${code}**: ${d.fails}/${d.total} failed (${failPct}%)\n`;
        });
      }

      prediction += `\n## 💡 Recommendations\n`;
      prediction += `- Focus extra tutorials on subjects with high failure rates\n`;
      if (atRisk.length > 0) prediction += `- Schedule counseling for ${atRisk.length} at-risk students\n`;
      prediction += `- Encourage peer study groups for struggling students\n`;
      prediction += `\n> ℹ️ *This analysis is based on statistical calculations. AI-powered detailed analysis is temporarily unavailable.*`;

      return prediction;
    };

    // Try AI models if available
    if (aiAvailable) {
      const models = ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

      for (const model of models) {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              stream: false,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const prediction = data.choices?.[0]?.message?.content || generateLocalPrediction();
            return new Response(JSON.stringify({ prediction }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          const t = await response.text();
          console.warn(`Model ${model} failed: ${response.status} ${t}`);

          // On 402 (credits depleted), fall back to local prediction
          if (response.status === 402) break;
          // On 429, try next model
          if (response.status === 429) continue;
          continue;
        } catch (err) {
          console.warn(`Model ${model} error:`, err);
          continue;
        }
      }
    }

    // Fallback: local stats-based prediction (no AI needed)
    const prediction = generateLocalPrediction();
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
