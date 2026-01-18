< #Welcome to Learniverse project

LEARNIVERSE — COSMIC CLASSROOM
================================

Project Summary
---------------
Learniverse is a full-stack, AI-augmented learning platform for students, teachers, and parents. It provides student dashboards, AI mentor chat, AI quiz generation, AI notes, teacher analytics/grading workflows, parent progress views, class onboarding, and discussion spaces. The app is built with Vite + React + TypeScript + Tailwind + shadcn UI, and uses Supabase (Postgres, Auth, RLS, Edge Functions) as the backend.

Primary Goals
-------------
- Provide a safe, engaging, age-appropriate learning environment for grades 6–12.
- Offer AI-driven mentoring, quiz generation, and notes to help students learn faster.
- Give teachers tools for analytics, grading, and class management.
- Give parents visibility into progress and feedback.
- Keep all data secure with Supabase RLS and role-based workflows.

Core Features (All Included)
----------------------------
Student Experience
- Student onboarding and class joining
- Student dashboard with XP, focus score, completed topics, and quiz stats
- Smart learning suggestions
- Assignments list and due dates
- AI Mentor chat (streamed responses)
- AI Notes (in mentor chat) with structured markdown
- AI Quiz generation (topic-based, 5 questions, explanations)
- Quiz attempts and performance tracking
- YouTube search integration (with optional API key)
- Student alerts and settings

Teacher Experience
- Teacher dashboard and analytics
- Class and student management
- Teacher feedback generation
- Grading workflow
- Teacher alerts

Parent Experience
- Parent dashboard and student overview
- Parent feedback and progress visibility
- Parent-specific relationship constraints and RLS policies

AI + Smart Learning Features
- AI Mentor (chat + notes + quiz prompts)
- AI Quiz Generator (separate endpoint, DB save)
- AI Feedback Generator (teacher/parent reports)
- Smart Learning Suggestions (topic hints)
- YouTube Search (optional API key)

Backend (Supabase) Features
- Auth + Postgres + RLS
- Edge Functions: ai-mentor, generate-quiz, generate-feedback, youtube-search, env-check, smart-learning-suggestions
- Extensive migration set for classes, students, parent/teacher roles, quizzes, analytics, assignments, notifications, and RLS hardening

Architecture Overview
---------------------
Frontend
- Vite + React + TypeScript
- Tailwind CSS + shadcn UI + Radix UI
- React Router for role-based routing
- TanStack Query for server data caching
- Sonner for toast notifications

Backend
- Supabase (Auth, Postgres, Storage, RLS)
- Supabase Edge Functions (Deno runtime)
- Supabase CLI for migrations and deploy

AI Providers
- Google Gemini (primary) via GEMINI_API_KEY
- Groq (optional fallback) via GROQ_API_KEY
- Optional YouTube Data API for real search results

Key Directories
---------------
- src/: React application source
- src/pages/: Student, Teacher, Parent, and Auth pages
- src/components/: UI components, layout, and feature widgets
- src/hooks/: Custom hooks for AI, Supabase, and UX
- supabase/functions/: Edge Functions
- supabase/migrations/: Schema migrations
- scripts/: Helper scripts (e.g., test hosted functions)
- public/: static assets

Important Docs (Already Included)
---------------------------------
- AI_FEATURES_SUMMARY.md — complete AI feature summary
- AI_SETUP_GUIDE.md — step-by-step AI setup
- QUICK_START_AI.md — 2-minute AI enablement
- DEPLOY_EDGE_FUNCTIONS.md — deployment instructions
- STATUS_COMPLETE.md — completion status and fixes
- FIX_STUDENT_CODE_NOW.sql — emergency onboarding fix

Environment Variables
---------------------
Frontend (.env or deployment settings)
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Supabase Edge Function Secrets (Supabase Dashboard → Edge Functions)
Required for AI:
- GEMINI_API_KEY (Google AI Studio key)
- Optional: GEMINI_MODEL (default: gemini-2.0-flash)
Optional AI fallback:
- GROQ_API_KEY
- Optional: GROQ_MODEL (default: llama-3.1-8b-instant)
Optional YouTube Search:
- YOUTUBE_API_KEY

Build, Run, and Test
--------------------
Install dependencies:
- npm install

Run development server:
- npm run dev

Build production bundle:
- npm run build

Preview build:
- npm run preview

Supabase (Optional)
- supabase link --project-ref wonpmcjrkkuyoubwosfr
- supabase db push --include-all
- supabase functions deploy ai-mentor
- supabase functions deploy generate-quiz
- supabase functions deploy generate-feedback
- supabase functions deploy youtube-search
- supabase functions deploy env-check
- supabase functions deploy smart-learning-suggestions

Edge Functions Included
-----------------------
- ai-mentor: AI chat, notes, quiz prompt handling (streaming)
- generate-quiz: quiz generation + DB persistence
- generate-feedback: teacher/parent performance insights
- youtube-search: YouTube discovery with fallback
- env-check: environment/health endpoint
- smart-learning-suggestions: suggestions endpoint

Database & Migrations
---------------------
Migrations implement:
- Student profiles, class membership, and codes
- Parent/teacher relationships and dashboard visibility
- Quizzes, questions, attempts, analytics
- Assignments, submissions, and attachments
- Notifications and triggers
- RLS hardening and recursion fixes

For the full list, see supabase/migrations/.

Security & RLS
--------------
- Row Level Security enforced in all major tables
- Role-based access for students, teachers, parents
- Policies updated through multiple migrations for safety

UI/UX Details
-------------
- Polished dashboards for student, teacher, parent
- Cards, badges, metrics, and alerts
- Responsive layout and mobile-friendly design
- Consistent use of Tailwind + Radix components

Status
------
All features and fixes are complete. AI features require provider keys to be enabled.

Repository
----------
This repository is ready for deployment and testing. See the included docs for AI setup and edge function deployment.

## Project info
https://github.com/akhil148656/learniverse-your-cosmic-classroom.git

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
