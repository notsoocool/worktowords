export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 13, 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          This is a placeholder privacy policy. Before launch, replace this
          content with a policy that describes what data you collect, how you
          use it, retention, third parties (e.g. authentication and AI
          providers), and how users can contact you or exercise their rights.
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
