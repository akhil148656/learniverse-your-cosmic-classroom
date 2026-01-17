# 🚀 Edge Functions Deployment & Setup

## What I Fixed:

### 1. **AI Mentor Chat** - Better Error Handling
- ✅ Shows clear error if `GEMINI_API_KEY` missing
- ✅ Improved authorization headers
- ✅ Better logging for debugging
- ✅ User-friendly error messages

### 2. **Quiz Generator** - Enhanced Error Handling  
- ✅ Graceful error messages
- ✅ Better logging
- ✅ Clear setup instructions in errors

### 3. **Feedback Generator** - Improved
- ✅ Better error handling
- ✅ Clear configuration messages

### 4. **YouTube Search** - Fallback Support
- ✅ Works WITHOUT YouTube API key (shows setup message)
- ✅ Graceful degradation
- ✅ Optional: Add `YOUTUBE_API_KEY` for real search

---

## 📦 Deploy Edge Functions

### Option 1: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wonpmcjrkkuyoubwosfr

# Deploy all functions
supabase functions deploy ai-mentor
supabase functions deploy generate-quiz
supabase functions deploy generate-feedback  
supabase functions deploy youtube-search
```

### Option 2: Via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/wonpmcjrkkuyoubwosfr
2. Click **Edge Functions** in sidebar
3. Click **Create a new function** → Upload code
4. Or use the Supabase CLI (easier)

---

## 🔑 Environment Variables to Add

Go to Supabase Dashboard → Settings → Edge Functions → Environment variables:

### Required for AI Features:

| Variable Name | Where to Get It | Required For |
|--------------|-----------------|--------------|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | AI Mentor, Quiz Gen, Feedback |

Optional (recommended):

| Variable Name | Example Value | Why |
|--------------|--------------|-----|
| `GEMINI_MODEL` | `gemini-1.5-flash-001` | Avoids common model-not-found errors |

### Optional (for YouTube search):

| Variable Name | Where to Get It | Required For |
|--------------|-----------------|--------------|
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials | YouTube search |

**Note**: YouTube search will work without API key (shows fallback message). Add key later if needed.

---

## ✅ How to Get Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Create an API key
3. Copy the key
4. Add `GEMINI_API_KEY` to Supabase environment variables

---

## 🧪 Test After Deployment

### 1. Test AI Mentor:
```bash
# Using curl:
curl -X POST https://wonpmcjrkkuyoubwosfr.supabase.co/functions/v1/ai-mentor \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}],"type":"chat"}'
```

Or just use the app:
- Go to Student Portal → AI Mentor
- Type a question
- Should see streaming response

### 2. Test Quiz Generator:
- Go to Student Portal → Quizzes
- Enter topic: "Planets"
- Click Generate
- Should create 5 questions

### 3. Test YouTube Search:
- Go to Student Portal → Search
- Search for a topic
- Should show either videos OR setup message

---

## 🐛 Troubleshooting

### "AI not configured" error:
✅ **Fixed!** Now shows: _"Please add GEMINI_API_KEY to Supabase Edge Function secrets"_

**Solution**:
1. Get a Gemini key from https://aistudio.google.com/app/apikey
2. Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to Supabase Edge Functions environment variables
3. Redeploy edge functions if needed

### "Authorization failed":
- Check your Supabase anon key in `.env`
- Make sure edge functions are deployed
- Check Supabase logs: Dashboard → Edge Functions → Logs

### YouTube not working:
- This is OPTIONAL - app works without it
- If you want real YouTube search, add `YOUTUBE_API_KEY`
- Get key from: https://console.cloud.google.com → Enable YouTube Data API v3

---

## 📊 What Each Function Does:

| Function | Purpose | Model | Streaming |
|----------|---------|-------|-----------|
| `ai-mentor` | Chat + Notes + Quiz questions | Gemini 1.5 Flash | Yes |
| `generate-quiz` | Full quiz generation with DB save | Gemini 1.5 Flash | No |
| `generate-feedback` | Parent/teacher performance reports | Gemini 1.5 Flash | No |
| `youtube-search` | Find educational videos | YouTube API | N/A |

---

## 🎯 Quick Deploy Checklist:

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref wonpmcjrkkuyoubwosfr`
- [ ] Deploy functions:
  ```bash
  supabase functions deploy ai-mentor
  supabase functions deploy generate-quiz
  supabase functions deploy generate-feedback
  supabase functions deploy youtube-search
  ```
- [ ] Get Gemini API key from https://aistudio.google.com/app/apikey
- [ ] Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) to Supabase environment variables
- [ ] Test in app (Student Portal → AI Mentor)

**Done!** 🎉
