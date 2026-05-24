export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using WorkToWords, you agree to use the platform lawfully and in a
          way that does not interfere with the service, other users, or our
          providers. You are responsible for the accuracy of the information
          you submit and for maintaining the security of your account.
        </p>
        <p>
          You may not use the service to create unlawful, infringing,
          deceptive, abusive, or harmful content, attempt unauthorized access,
          reverse engineer restricted systems, or misuse generated output in a
          way that violates applicable law or third-party rights.
        </p>
        <p>
          WorkToWords may suspend or terminate access when accounts violate
          these terms, create security risk, or abuse the platform. We may also
          update or discontinue product features as the service evolves.
        </p>
        <p>
          AI-generated results are provided on an as-is basis and may be
          incomplete or inaccurate. You are responsible for reviewing output
          before publishing, sharing, or relying on it for personal, legal,
          financial, or professional decisions.
        </p>
        <p>
          To the extent permitted by law, WorkToWords is not liable for
          indirect, incidental, special, or consequential damages arising from
          use of the service. Your continued use of the platform after updates
          to these terms means you accept the revised terms.
        </p>
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
      </div>
    </main>
  );
}
