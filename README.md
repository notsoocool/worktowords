# ✍️ WorktoWords

Turn your daily work into **social-ready content** — LinkedIn posts, Instagram captions, and YouTube scripts — fast, clean, and on-brand.

## ✨ Features

- 🔐 **Auth** with [Clerk](https://clerk.com) (Google sign-in supported)
- 🧠 **AI generation** via OpenAI — **Help Me Write** and **Write For Me** modes
- 📱 **Multi-platform output** — LinkedIn, Instagram, and YouTube (select one or more per run)
- 🎯 **Goals** — `job` · `growth` · `authority` (per post or default in settings)
- 💳 **Pro upgrade** via Razorpay (₹149 / 30 days, UPI-friendly checkout)
- 📅 **Pro expiry** — auto-downgrades to Free after 30 days
- 📊 **Usage limits**
  - Free: **5** generations/day
  - Pro: **100** generations/day
- 🧾 **History** — saved posts, filter by goal, reopen on the dashboard
- ⚙️ **Settings** — default goal + tone (`casual` · `professional` · `storytelling`)
- 🎛️ **Regenerate** — per-platform refresh; adjust length, tone, technical level, storytelling
- 🔔 **Live toasts** during generation
- 🌓 **Light / dark** theme

## 🧰 Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Clerk** — authentication
- **Supabase Postgres** — posts, settings, usage, subscriptions
- **OpenAI** — content generation
- **Razorpay** — payments

## ✅ Prerequisites

- **Node.js 20+**
- **pnpm 9+**

## 🚀 Getting Started

```bash
git clone https://github.com/notsoocool/worktowords.git
cd worktowords
pnpm install
```

Create `.env.local`:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OpenAI
OPENAI_API_KEY=

# Supabase (server routes use the service role key)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay — use test keys locally
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Optional:

```bash
# Bypass daily limits for admin/testing (comma-separated Clerk user IDs)
ROOT_USER_ID=
# ROOT_USER_IDS=

# Custom Clerk domains (production)
# NEXT_PUBLIC_CLERK_FRONTEND_API=
# NEXT_PUBLIC_CLERK_ACCOUNTS_ORIGIN=
```

### Database

In the [Supabase](https://supabase.com) SQL editor, run the full schema:

```text
supabase/posts.sql
```

This creates tables, indexes, RLS policies, and `check_and_increment_usage()` (required for generation limits).

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |

## 🗄️ Database (Supabase)

| Table | Purpose |
|-------|---------|
| `posts` | Generated content (`content`, `hashtags`, `goal`, `type`, `linkedin`, `instagram`, `youtube`) |
| `user_settings` | Default goal + writing tone |
| `user_usage` | Daily usage, plan, expiry |
| `user_subscriptions` | Razorpay order/payment refs, plan status |

**Function:** `check_and_increment_usage(user_id)` — atomic daily limit check + Pro expiry downgrade.

## 🔌 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | Liveness check |
| `POST` | `/api/generate` | Generate + save post(s) |
| `GET` | `/api/posts` | List history (`?goal=` optional) |
| `GET` | `/api/posts/[id]` | Single post |
| `GET` | `/api/settings` | User settings |
| `PATCH` | `/api/settings` | Update settings |
| `GET` | `/api/usage` | Remaining generations + plan |
| `POST` | `/api/razorpay/create-order` | Create Pro order (₹149) |
| `POST` | `/api/razorpay/verify` | Verify payment + activate Pro |

## 💳 Razorpay (Standard Checkout)

Flow ([Razorpay docs](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)):

1. **Server** — `POST /api/razorpay/create-order` creates an order (14900 paise, INR) and stores a pending row in `user_subscriptions`.
2. **Client** — Opens Checkout with `key`, `order_id`, `amount`, `currency`, `prefill`.
3. **Success** — Client receives `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`.
4. **Server** — `POST /api/razorpay/verify` validates the signature and upgrades the user to Pro for 30 days.

Use **test** keys in development; **live** keys in production. Enable **automatic capture** for orders in the Razorpay Dashboard.

## 🚢 Deployment

Set the same environment variables on your host (e.g. Vercel). **Required for core features:**

- Clerk keys
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (usage, posts, payments)
- Razorpay keys

After deploy:

1. Confirm `supabase/posts.sql` has been applied to your production project.
2. Hit `GET /api/health` to confirm the app is up.
3. Run a test generation and (optionally) a Razorpay test checkout.

## 🤝 Contributing

We welcome contributions — especially for [open issues](https://github.com/notsoocool/worktowords/issues).

- Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup, conventions, and PR expectations.
- Every PR runs **lint**, **typecheck**, and **build** in GitHub Actions.
- Comment on an issue before starting large changes.

## 📁 Project layout

```text
app/              Pages and API routes
components/       UI (dashboard, history, settings, …)
lib/services/     Business logic (generate, payments, usage, posts)
lib/ai/           Platform-specific AI prompts (LinkedIn, Instagram, YouTube)
supabase/         SQL schema
proxy.ts          Auth (Clerk) + security headers
```

## 🧪 Notes

- Secrets live in `.env.local` (gitignored).
- `/dashboard`, `/history`, and `/settings` require sign-in (Clerk).
- Server-side Supabase access uses the **service role** key — never expose it to the client.

## 📄 License

MIT
