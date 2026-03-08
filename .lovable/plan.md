

## Plan: Faster Fetching + Manual CAPTCHA Fallback

### Problem
1. Auto-fetch is slow due to excessive delays (`AI_BASE_DELAY_MS = 1200ms`, inter-student delay `2500ms`, retry waits `700-900ms`)
2. When auto-fetch fails for a student (after all retries), there's no way to manually enter the CAPTCHA — it just marks "Fetch Failed"

### Changes

#### 1. Speed Up Edge Function (`supabase/functions/fetch-rgpv-results/index.ts`)
- Reduce `AI_BASE_DELAY_MS` from `1200ms` to `400ms`
- Reduce inter-attempt waits from `700-900ms` to `300ms`
- Use `google/gemini-2.5-flash-lite` as first model (fastest), then fall back to `google/gemini-2.5-flash`, then `google/gemini-2.5-pro`
- Reduce `MAX_ATTEMPTS` from 8 to 5 (faster failure, then manual fallback)

#### 2. Manual CAPTCHA Fallback UI (`src/components/CaptchaDialog.tsx`)
- When a student fails auto-fetch, show a manual CAPTCHA entry panel instead of just marking "Error"
- Display the CAPTCHA image from the session and an input field for manual text entry
- Add "Submit" and "Skip" buttons
- On submit, call the existing `submit` action on the edge function

#### 3. Dashboard Flow Update (`src/pages/Dashboard.tsx`)
- When `auto-fetch` returns an error with a CAPTCHA image, switch to manual mode for that enrollment
- Store the failed enrollment's session data and CAPTCHA image in state
- After manual submit (or skip), continue auto-fetching the remaining enrollments
- Reduce inter-student delay from `2500ms` to `1000ms`
- Add a `manualCaptchaData` state: `{ enrollment, sessionData, captchaImage } | null`
- When set, the `CaptchaDialog` shows the manual input UI; when null, shows the auto-fetch progress

#### 4. Edge Function: Return CAPTCHA on Failure
- When `auto-fetch` exhausts all attempts, return `captchaImage` and `sessionData` in the error response so the frontend can offer manual entry

### Files to Modify
- `supabase/functions/fetch-rgpv-results/index.ts` — speed optimizations + return captcha on failure
- `src/components/CaptchaDialog.tsx` — add manual CAPTCHA input mode
- `src/pages/Dashboard.tsx` — handle manual fallback flow, reduce delays

