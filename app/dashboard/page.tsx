import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardUi } from "@/components/dashboard/dashboard-ui";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) redirect("/");

  return <DashboardUi />;
}

