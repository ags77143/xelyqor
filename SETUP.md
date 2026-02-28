# Xelyqor — Complete Setup Guide

## File Structure

```
xelyqor/
├── backend/
│   ├── main.py
│   ├── ai.py
│   ├── db.py
│   ├── extractor.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── .env.example
│   └── routers/
│       ├── __init__.py
│       ├── subjects.py
│       ├── lectures.py
│       ├── materials.py
│       └── chat.py
└── frontend/
    ├── package.json
    ├── jsconfig.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.local.example
    └── src/
        ├── app/
        │   ├── layout.js
        │   ├── page.js
        │   ├── globals.css
        │   └── auth/
        │       └── page.js
        ├── components/
        │   ├── Navbar.js
        │   ├── Sidebar.js
        │   ├── Library.js
        │   ├── LectureView.js
        │   └── NewLectureModal.js
        └── lib/
            ├── supabase.js
            └── api.js
```

---

## STEP 1: Supabase SQL

Run this in Supabase → SQL Editor if you haven't already set up the tables:

```sql
-- Create subjects table
create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  colour text default '#c17b2e',
  created_at timestamptz default now()
);

-- Create lectures table
create table if not exists lectures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  source_type text not null, -- youtube, transcript, pdf, pptx
  source_ref text default '',
  raw_transcript text not null,
  created_at timestamptz default now()
);

-- Create study_materials table
create table if not exists study_materials (
  id uuid default gen_random_uuid() primary key,
  lecture_id uuid references lectures(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  summary text,
  notes text,
  glossary text, -- stored as JSON string
  quiz text,     -- stored as JSON string, null until generated
  flashcards text, -- stored as JSON string, null until generated
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table subjects enable row level security;
alter table lectures enable row level security;
alter table study_materials enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users own subjects" on subjects for all using (auth.uid() = user_id);
create policy "Users own lectures" on lectures for all using (auth.uid() = user_id);
create policy "Users own study_materials" on study_materials for all using (auth.uid() = user_id);
```

**IMPORTANT**: The backend uses the **service role key** (bypasses RLS). Get it from:
Supabase → Settings → API → `service_role` key (keep this secret, backend only)

---

## STEP 2: Environment Variables

### Backend — create `backend/.env`:
```
SUPABASE_URL=https://lcapdjclcivhxzopxedf.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
GROQ_API_KEY=your-groq-api-key-here
```

Get your Groq API key at https://console.groq.com

### Frontend — create `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://lcapdjclcivhxzopxedf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Get your Supabase anon key from: Supabase → Settings → API → `anon public` key

---

## STEP 3: Run Backend Locally

Open a terminal in the `backend/` folder:

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

Visit http://localhost:8000/health — should return `{"status":"ok"}`

**Note on Whisper**: The first time a YouTube video without captions is processed, Whisper will download the `base` model (~145MB). This only happens once. You need ffmpeg installed for audio processing — download from https://ffmpeg.org/download.html and add to PATH.

---

## STEP 4: Run Frontend Locally

Open another terminal in the `frontend/` folder:

```bash
npm install
npm run dev
```

Visit http://localhost:3000

---

## STEP 5: Deploy Backend to Railway

1. Go to https://railway.app and create a new project
2. Click **"Deploy from GitHub repo"** → connect your backend folder
   - Or use Railway CLI: `railway init` then `railway up` from `backend/`
3. After deploy, go to your service → **Variables** tab and add:
   ```
   SUPABASE_URL=https://lcapdjclcivhxzopxedf.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   GROQ_API_KEY=your-groq-api-key
   ```
4. Railway auto-detects the `Procfile` and runs `uvicorn`
5. Copy your Railway deployment URL (e.g. `https://xelyqor-backend.up.railway.app`)

---

## STEP 6: Deploy Frontend to Vercel

1. Go to https://vercel.com and import your frontend folder from GitHub
2. Vercel auto-detects Next.js
3. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://lcapdjclcivhxzopxedf.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
   ```
4. Deploy!

---

## STEP 7: Supabase Auth Configuration

In Supabase → Authentication → URL Configuration:
- **Site URL**: your Vercel URL (e.g. `https://xelyqor.vercel.app`)
- **Redirect URLs**: add `https://xelyqor.vercel.app/**`

---

## Troubleshooting

### "pyiceberg/pyroaring compilation error"
You have the wrong supabase version. Pin exactly: `supabase==2.3.4` and `httpx==0.24.1`. Delete venv and reinstall.

### "Cannot find module '@/...'"
Check `jsconfig.json` exists in `frontend/` root with the `@/*` path alias shown.

### YouTube extraction failing
- The video may not have captions enabled. Try a different video to test.
- For videos without captions, ffmpeg must be installed and in PATH for Whisper.
- As a fallback, use Tactiq (https://tactiq.io) to get the transcript, then paste it.

### CORS errors in browser
The FastAPI app allows all origins. If you still get CORS errors, check `NEXT_PUBLIC_API_URL` in your `.env.local` — make sure there's no trailing slash.

### Quiz/flashcards generate slowly
This is normal — each is a separate AI call. Groq's free tier can occasionally be slow under load.

---

## How it Works

1. **User uploads lecture** → backend extracts text → two parallel AI calls generate title/summary/notes + glossary
2. **Notes are saved to Supabase** and displayed immediately
3. **Quiz and flashcards** are only generated when user clicks the ⚡ button — then saved so they never need regenerating
4. **Chatbot** uses the raw transcript as context for every message, giving accurate lecture-specific answers
5. **Subjects** organise lectures into folders; lectures can be moved between subjects
