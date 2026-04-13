import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:py-12">
      <SettingsForm />
    </div>
  );
}
