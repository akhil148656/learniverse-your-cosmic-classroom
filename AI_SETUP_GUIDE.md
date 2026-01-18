# AI Integration Setup Guide

## ✅ Your AI features are ready - just need API key!

Your Learniverse project already has:
- ✅ AI Mentor Chat (real-time streaming responses)
- ✅ AI Quiz Generator (generates custom quizzes on any topic)
- ✅ Edge Functions deployed to Supabase

## ✉️ Optional: Disable signup confirmation emails

If you don’t want Supabase to send a confirmation email when a new user signs up, you must turn off email confirmations in your Supabase project settings (this is not controlled by the frontend code).

Steps:

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/wonpmcjrkkuyoubwosfr
2. Go to **Authentication** → **Providers** → **Email**
3. Turn **Confirm email** OFF

After this, `supabase.auth.signUp(...)` will immediately return a `session`, and the app will log the user in without any email step.

## 🔑 Required: Get Your Gemini API Key

Your Supabase Edge Functions call the Google Gemini API (Google AI Studio key).

### Steps:

1. **Get API Key from Google AI Studio**:
   - Go to https://aistudio.google.com/app/apikey
   - Create an API key

2. **Add to Supabase**:
   - Open your Supabase Dashboard: https://supabase.com/dashboard/project/wonpmcjrkkuyoubwosfr
   - Go to **Settings** → **Edge Functions** → **Environment variables**
   - Click **Add variable**
   - Name: `GEMINI_API_KEY`
   - Value: `<your-google-ai-studio-api-key>`
   - Click **Save**

3. **(Recommended) Set the model explicitly**:
   - Name: `GEMINI_MODEL`
   - Value: `gemini-2.0-flash`
   - Notes: Some older revisioned model ids (like `gemini-1.5-flash-001`) may return 404 “model not found”.

4. **Redeploy Edge Functions** (if needed):
   ```bash
   supabase functions deploy ai-mentor
   supabase functions deploy generate-quiz
   supabase functions deploy generate-feedback
   ```

## 🎯 What Works Now:

### 1. AI Mentor Chat (`/student/ai-mentor`)
- Real-time streaming responses
- Conversational learning assistant
- Helps with homework, concepts, and study tips
- Model: Google Gemini (configured via `GEMINI_MODEL`)

### 2. AI Quiz Generator (`/student/quizzes`)
- Enter any topic → AI generates 5 questions
- Multiple choice with explanations
- Automatically saves to database
- Adaptive difficulty

### 3. AI Notes Generator (integrated in mentor chat)
- Can generate structured study notes
- Markdown formatted
- Includes examples and summaries

## 🧪 Test It:

1. **Test AI Mentor**:
   - Go to Student Portal → AI Mentor
   - Ask: "Explain photosynthesis"
   - Should stream response in real-time

2. **Test Quiz Generation**:
   - Go to Student Portal → Quizzes
   - Enter topic: "Solar System"
   - Click "Generate Quiz"
   - Should create 5 questions with multiple choice

## 🚨 Troubleshooting:

### "GEMINI_API_KEY is not configured"
→ Add the key to Supabase Edge Function environment variables (see step 2 above)

### Gemini API error (404) "model ... not found"
→ Set `GEMINI_MODEL` to `gemini-2.0-flash` (or remove `GEMINI_MODEL` to use the default)

### "AI service unavailable"
→ Check Supabase logs: Dashboard → Edge Functions → Logs
→ Verify the Google AI Studio API key is valid

### "Rate limit exceeded"
→ Lovable API has usage limits; wait a moment and try again

### "Usage limit reached"
→ Check your Google AI Studio / Google Cloud quota and billing

## 📊 Current Setup:

- **Model**: Google Gemini (direct)
- **Streaming**: Yes (for chat)
- **Rate Limits**: Managed by Google
- **Cost**: Based on Google usage/quota

## 🔧 Alternative: Use OpenAI directly

If you prefer OpenAI instead of Lovable:

1. Get OpenAI API key from https://platform.openai.com
2. Modify edge functions to call OpenAI API:
   ```typescript
   const response = await fetch("https://api.openai.com/v1/chat/completions", {
     method: "POST",
     headers: {
       Authorization: `Bearer ${OPENAI_API_KEY}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       model: "gpt-4o-mini",
       messages: [...],
       stream: true,
     }),
   });
   ```
3. Add `OPENAI_API_KEY` to Supabase environment variables

---

**Once you add the `GEMINI_API_KEY`, everything will work!** 🚀
