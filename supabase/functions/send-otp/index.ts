import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit: check if OTP was sent within last 30 seconds
    const { data: recentOtp } = await supabase
      .from("otp_verifications")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentOtp) {
      const secondsSince = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsSince < 30) {
        return new Response(
          JSON.stringify({ error: `Please wait ${Math.ceil(30 - secondsSince)} seconds before requesting another OTP` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete old OTPs for this email
    await supabase
      .from("otp_verifications")
      .delete()
      .eq("email", email.toLowerCase());

    // Insert new OTP
    const { error: dbError } = await supabase
      .from("otp_verifications")
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt,
        verified: false,
      });

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to store OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Gmail SMTP
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPass) {
      throw new Error("Gmail credentials are not configured");
    }

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPass,
        },
      },
    });

    await client.send({
      from: gmailUser,
      to: email,
      subject: "Your OTP for Faculty Registration",
      content: "auto",
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

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send OTP" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
