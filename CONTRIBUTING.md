# Contributing to WorktoWords

Thanks for helping improve WorktoWords. This guide covers local setup, how we review PRs, and common pitfalls.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- Accounts for local testing (as needed): [Clerk](https://clerk.com), [Supabase](https://supabase.com), [OpenAI](https://platform.openai.com), [Razorpay](https://razorpay.com) (test mode)

## Local setup

```bash
git clone https://github.com/notsoocool/worktowords.git
cd worktowords
pnpm install
```

Create `.env.local` (see [README.md](./README.md)). Minimum for most features:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

### Database

Run the schema in [supabase/posts.sql](./supabase/posts.sql) on your Supabase project (SQL Editor). This creates tables and the `check_and_increment_usage` function required for generation limits.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Before you open a PR

1. **Link an issue** — comment on the issue first or ask a maintainer to assign you.
2. **Branch from `main`** — e.g. `fix/razorpay-webhook` or `feat/delete-history-post`.
3. **Run checks locally:**

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

   CI runs the same steps on every pull request.

4. **Keep PRs focused** — one issue per PR when possible.
5. **Describe how you tested** — use the PR template checklist.

## Code guidelines

- **Reuse existing services** — API routes should stay thin; put logic in `lib/services/` (e.g. `paymentService.ts`, `usageService.ts`).
- **Don’t replace working API routes** — if you extend an endpoint (e.g. `/api/razorpay/create-order`), check all callers (dashboard, upgrade CTA) still get the fields they need (`keyId`, `prefill`, etc.).
- **Auth** — routes called by third parties (e.g. Razorpay webhooks) must be added to public routes in `proxy.ts`.
- **Secrets** — never commit `.env.local` or API keys.
- **README** — update env var docs when you add new configuration.

## Project layout (quick map)

| Area | Location |
|------|----------|
| Pages | `app/` |
| API routes | `app/api/` |
| Business logic | `lib/services/` |
| AI generation | `lib/ai/` |
| DB schema | `supabase/posts.sql` |
| UI | `components/` |

## Payment & webhooks

- Client verification: `POST /api/razorpay/verify`
- Order creation: `POST /api/razorpay/create-order` (via `paymentService.createOrder`)
- Server-side backup should use webhooks and share upgrade logic with `verifyPayment` — avoid duplicating Supabase writes.

## Getting help

- Open a [GitHub issue](https://github.com/notsoocool/worktowords/issues) with steps to reproduce and what you expected.
- For GSSoC contributors: mention the program in your issue/PR if relevant.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).
