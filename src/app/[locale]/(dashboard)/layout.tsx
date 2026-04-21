import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import { getDashboardShellProps } from "@/lib/dashboard/shell-props";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await getDashboardShellProps();
  if (!shell) redirect("/login");

  return (
    <DashboardShell
      links={shell.links}
      role={shell.role}
      userName={shell.userName}
      avatarUrl={shell.avatarUrl}
      activeLearnerId={shell.activeLearnerId}
      learners={shell.learners}
    >
      {children}
    </DashboardShell>
  );
}
