# ✍️ WorktoWords

Turn your daily work into **LinkedIn posts** — fast, clean, and consistently on-brand.

## ✨ Features

- 🔐 **Auth** with Clerk (Google sign-in supported)
- 🧠 **AI post generation** via OpenAI
- 🧾 **History**: every generated post is saved and reloadable
- ⚙️ **Settings** per user:
  - Default goal: `job` / `growth` / `authority`
  - Writing tone: `casual` / `professional` / `storytelling`
- 🎛️ **Regenerate** controls: shorter, more casual, more technical, storytelling
- 🔔 **Live toasts** while generating (human-friendly progress)

## 🧰 Tech Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui**
- **Clerk** for authentication
- **Supabase Postgres** for persistence
- **OpenAI** for generation

## ✅ Prerequisites

- Node.js 20+
- pnpm

## 🚀 Getting Started

Install dependencies:

```bash
pnpm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

OPENAI_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## 🗄️ Database (Supabase)

This repo includes the schema in `supabase/posts.sql`.

Tables:
- **posts**
  - `user_id`
  - `content`
  - `hashtags`
  - `created_at`
- **user_settings**
  - `user_id`
  - `default_goal`
  - `tone`
  - `updated_at`

## 🔌 API Routes

- `POST /api/generate` → generate + save a post
- `GET /api/posts` → fetch post history
- `GET /api/settings` → fetch settings
- `PATCH /api/settings` → update settings

## 🧪 Notes

- ✅ Secrets are kept in `.env.local` (ignored by git).
- 🧩 The dashboard is protected (`/dashboard`) — signed out users are redirected home.

## 📄 License

MIT
