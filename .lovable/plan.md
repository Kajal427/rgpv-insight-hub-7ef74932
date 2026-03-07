

## Plan: Fix CAPTCHA Solving Accuracy

### Root Cause
From the logs, the AI is consistently getting wrong CAPTCHA answers (0% success rate across 10+ attempts per student). Two issues:
1. Using `gemini-2.5-flash` which has weaker vision capabilities for distorted text
2. `gemini-2.5-pro` keeps getting rate-limited (429) and returns empty strings
3. The prompt is generic and doesn't help the model understand the specific CAPTCHA style

### Changes

#### Edge Function (`supabase/functions/fetch-rgpv-results/index.ts`)

1. **Use newer, better vision models**: Switch to `google/gemini-3-flash-preview` (best speed+accuracy balance for vision) as primary, with `google/gemini-2.5-flash` as fallback

2. **Multi-guess approach**: Ask the AI to return its top 3 possible readings of the CAPTCHA, then try each one before refreshing the CAPTCHA. This triples the chance of getting it right per CAPTCHA image.

3. **Improved prompt**: Make the prompt more specific about RGPV CAPTCHA characteristics (e.g., typically 5-6 chars, specific font style, colored noise lines)

4. **Fresh CAPTCHA per attempt**: Instead of retrying the same hard-to-read CAPTCHA 10 times, refresh to get a new (potentially easier) CAPTCHA after 2-3 failed guesses on the same image

5. **Reduce MAX_ATTEMPTS to 6** but each attempt tries multiple guesses, so effective attempts increase while wall-clock time decreases

### Files to Modify
- `supabase/functions/fetch-rgpv-results/index.ts`

