# ✍️ WorktoWords

Turn your daily work into **LinkedIn posts** — fast, clean, and consistently on-brand.

## ✨ Features

- 🔐 **Auth** with Clerk (Google sign-in supported)
- 🧠 **AI post generation** via OpenAI
- 💳 **Pro upgrade** via Razorpay (UPI-focused checkout)
- 📅 **Pro expiry**: Pro is active for 30 days after payment, then auto-downgrades to Free
- 📊 **Usage limits**:
  - Free: 5 generations/day
  - Pro: 100 generations/day
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

# Razorpay (use test keys locally)
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
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
- **user_usage**
  - `user_id`
  - `daily_usage`
  - `last_used_date`
  - `plan` (`free` | `pro`)
  - `plan_expiry` (date)
  - `updated_at`
- **user_subscriptions**
  - `user_id`
  - `payment_id`
  - `razorpay_order_id`
  - `plan` (`free` | `pro`)
  - `plan_status` (`inactive` | `active`)
  - `plan_expiry` (date)
  - `amount_paise`
  - `currency`
  - `created_at`
  - `updated_at`

Functions:
- `check_and_increment_usage(user_id)` (atomic daily limit + auto downgrade when expired)

## 🔌 API Routes

- `POST /api/generate` → generate + save a post
- `GET /api/posts` → fetch post history
- `GET /api/settings` → fetch settings
- `PATCH /api/settings` → update settings
- `GET /api/usage` → usage + plan status (remaining generations)
- `POST /api/razorpay/create-order` → create Razorpay order for Pro (₹149)
- `POST /api/razorpay/verify` → verify signature + activate Pro for 30 days

## 🧪 Notes

- ✅ Secrets are kept in `.env.local` (ignored by git).
- 🧩 The dashboard is protected (`/dashboard`) — signed out users are redirected home.

## 📄 License

MIT
