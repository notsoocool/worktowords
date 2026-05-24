export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          WorkToWords collects the information needed to create and manage your
          account, generate AI-assisted writing output, and keep your workspace
          functional. This can include your profile details, authentication
          identifiers, prompts, generated content, billing metadata, and basic
          device or usage information needed for security and product
          improvement.
        </p>
        <p>
          We use this information to provide the service, personalize your
          experience, process payments, prevent abuse, troubleshoot issues, and
          communicate important account or product updates. We do not sell your
          personal information.
        </p>
        <p>
          Some data is processed by trusted service providers that help us run
          the product, such as authentication, database, AI, analytics, and
          payment providers. These providers may only access the information
          needed to perform their services for WorkToWords.
        </p>
        <p>
          We keep data only for as long as it is reasonably necessary to
          provide the service, comply with legal obligations, resolve disputes,
          and enforce platform policies. You may request deletion of your
          account data, subject to records we must retain for security,
          financial, or legal reasons.
        </p>
        <p>
          You are responsible for avoiding the submission of confidential,
          regulated, or highly sensitive information unless your organization
          has approved that use. While we apply reasonable safeguards, no
          internet-based service can guarantee absolute security.
        </p>
        <p>
          For questions about privacy, contact{" "}
          <a
            className="font-medium text-foreground underline-offset-4 hover:underline"
            href="mailto:vyasyajush@gmail.com"
          >
            vyasyajush@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
