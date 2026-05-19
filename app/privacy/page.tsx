const sections = [
  {
    title: "Information we collect",
    body: [
      "Account information provided through Clerk, such as your name, email address, profile image, and authentication identifiers.",
      "Generated post history, hashtags, writing settings, usage counts, plan status, and plan expiry stored in Supabase so the dashboard can restore your work.",
      "Prompts and generation inputs you submit when asking WorktoWords to create or regenerate content.",
      "Payment metadata returned by Razorpay for Pro purchases, including payment IDs, order IDs, amount, currency, plan status, and expiry dates. WorktoWords does not store card, UPI, or bank credentials.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "To authenticate your account and protect signed-in dashboard routes.",
      "To generate, save, and reload your LinkedIn-style posts and related settings.",
      "To enforce daily usage limits for Free and Pro plans.",
      "To verify Razorpay payments and activate Pro access for the purchased 30-day period.",
      "To diagnose errors, prevent abuse, and improve product reliability.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "Clerk handles authentication and session management.",
      "Supabase stores application data such as generated posts, user settings, usage counters, and subscription records.",
      "OpenAI processes generation requests that you submit through the app.",
      "Razorpay processes payments for Pro upgrades and returns payment verification metadata to WorktoWords.",
    ],
  },
  {
    title: "Retention and deletion",
    body: [
      "Generated posts, settings, usage records, and subscription records are kept while your account is active so the product can function.",
      "You may request deletion of your account-related application data by contacting the support email below.",
      "Some billing and security records may be retained where required for legal, accounting, fraud-prevention, or dispute-resolution purposes.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can choose what prompts and work details you submit for generation.",
      "You can delete generated content from your account where the product interface supports it, or request deletion by email.",
      "You can stop using Pro features by allowing the 30-day Pro period to expire.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed text-muted-foreground">
        <p>
          WorktoWords helps you turn daily work updates into polished social
          posts. This policy explains what information is handled by the app and
          the services it relies on.
        </p>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            For privacy questions or data deletion requests, contact{" "}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="mailto:vyasyajush@gmail.com"
            >
              vyasyajush@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
