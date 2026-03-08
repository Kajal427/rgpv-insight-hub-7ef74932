import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function generateSecureOtp(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String((random[0] % 900000) + 100000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: one OTP request every 30 seconds per email
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      const secondsSince = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsSince < 30) {
        return new Response(
          JSON.stringify({ error: `Please wait ${Math.ceil(30 - secondsSince)} seconds before requesting another OTP` }),
          { status: 429, headers: jsonHeaders }
        );
      }
    }

    const otp = generateSecureOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Send email via Gmail SMTP using Nodemailer
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailAppPassword) {
      return new Response(JSON.stringify({ error: "Email provider is not configured" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"RGPV Result Analyzer" <${gmailUser}>`,
      to: email,
      subject: "Your OTP for Registration",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1a1a2e; margin-bottom: 8px;">Email Verification</h2>
          <p style="color: #6b7280; font-size: 14px;">Use the code below to verify your email for faculty registration:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    // Email sent — store OTP
    await supabase.from("otp_verifications").delete().eq("email", email);

    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        email,
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      });

    if (insertError) {
      console.error("Insert OTP error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store OTP" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
  } catch (err) {
    console.error("Send OTP error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to send OTP" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
