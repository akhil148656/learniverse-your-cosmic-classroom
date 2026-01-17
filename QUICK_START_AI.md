## 🚀 Quick Start: Enable AI Features in 2 Minutes

### Step 1: Get Gemini API Key
1. Go to https://aistudio.google.com/app/apikey
2. Create an API key
3. Copy the key

### Step 2: Add to Supabase
1. Open https://supabase.com/dashboard/project/wonpmcjrkkuyoubwosfr
2. Click **Settings** (bottom left)
3. Click **Edge Functions**
4. Scroll to **Environment variables** section
5. Click **Add variable**:
   - Name: `GEMINI_API_KEY`
   - Value: paste your key
6. Click **Save**

Optional (recommended):
- Add `GEMINI_MODEL` = `gemini-2.0-flash` (avoids 404 model-not-found errors)

### Step 3: Test
1. Go to your app: http://127.0.0.1:5174
2. Login as student
3. Go to **AI Mentor** page
4. Type: "Explain photosynthesis"
5. See AI response stream in real-time ✅

### Step 4: Test Quiz
1. Go to **Quizzes** page
2. Type topic: "Solar System"
3. Click **Generate**
4. Take the quiz ✅

---

## That's it! 🎉

Both features now work:
- ✅ AI Mentor Chat (real-time responses)
- ✅ AI Quiz Generator (custom quizzes on any topic)

No code changes needed - just the API key!
