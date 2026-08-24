import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardShellLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <Sidebar user={session} />
      <main className="flex-1 min-w-0 bg-slate-50 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
