export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          This is a placeholder terms of service. Replace it with terms that
          cover acceptable use, account responsibilities, limitations of
          liability, subscription or billing (if applicable), and governing law
          before production use.
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
