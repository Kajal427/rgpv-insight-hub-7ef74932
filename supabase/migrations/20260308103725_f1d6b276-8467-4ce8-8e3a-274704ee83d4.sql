
CREATE TABLE public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert OTP" ON public.otp_verifications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read own OTP by email" ON public.otp_verifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update OTP" ON public.otp_verifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_otp_email_expires ON public.otp_verifications (email, expires_at);
