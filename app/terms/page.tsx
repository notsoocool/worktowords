const terms = [
  {
    title: "Using WorktoWords",
    body: [
      "You are responsible for the information you submit and for reviewing AI-generated content before publishing it elsewhere.",
      "You should not submit confidential, sensitive, illegal, or third-party private information unless you have the right to use it.",
      "You agree not to misuse the service, interfere with its security, attempt to bypass rate limits, or use it to create harmful, deceptive, infringing, or abusive content.",
    ],
  },
  {
    title: "Accounts and access",
    body: [
      "Authentication is provided through Clerk. You are responsible for keeping your account access secure.",
      "Dashboard features require an active signed-in account.",
      "WorktoWords may restrict or suspend access where misuse, security risk, or policy abuse is detected.",
    ],
  },
  {
    title: "Plans, billing, and Pro access",
    body: [
      "Free users receive the daily generation allowance shown in the product.",
      "Pro access is activated after successful Razorpay payment verification and remains active for 30 days from purchase.",
      "When the 30-day Pro period expires, the account automatically returns to the Free plan unless another Pro purchase is completed.",
      "Payments are processed by Razorpay. Any refund, chargeback, or billing dispute may require reviewing Razorpay payment records.",
    ],
  },
  {
    title: "AI-generated content",
    body: [
      "Generated output may be inaccurate, incomplete, repetitive, or unsuitable for your intended audience.",
      "You are responsible for editing, fact-checking, and ensuring published content follows platform rules, employer policies, and applicable law.",
      "WorktoWords does not guarantee engagement, reach, hiring outcomes, sales outcomes, or business results from generated posts.",
    ],
  },
  {
    title: "Availability and changes",
    body: [
      "The service may change as features, pricing, providers, and infrastructure evolve.",
      "Access can be interrupted by maintenance, provider outages, API limits, payment provider issues, or technical failures.",
      "These terms may be updated as the product changes. Continued use after updates means you accept the revised terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed text-muted-foreground">
        <p>
          These terms describe the basic rules for using WorktoWords, including
          AI generation, saved history, account access, and Pro billing.
        </p>

        {terms.map((section) => (
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
            For questions about these terms, contact{" "}
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
