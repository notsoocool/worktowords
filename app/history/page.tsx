import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { HistoryContent } from "@/components/history-content";

export default async function HistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
      <HistoryContent />
    </div>
  );
}
