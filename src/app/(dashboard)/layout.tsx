import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { WelcomeTour } from "@/components/welcome-tour";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      <Sidebar
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          orgName: (session.user as { orgName?: string }).orgName,
        }}
      />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
      <WelcomeTour />
      <Toaster position="top-right" />
    </div>
  );
}
