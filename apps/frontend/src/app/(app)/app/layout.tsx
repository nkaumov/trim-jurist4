import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { serverApiFetch } from "@/lib/server-api";
import type { AuthMe } from "@/features/api";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await serverApiFetch<AuthMe>("/auth/me");
  if (!me) redirect("/login");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

