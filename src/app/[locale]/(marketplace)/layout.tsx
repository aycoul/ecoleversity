import { DashboardShell } from "@/components/admin/dashboard-shell";
import { getDashboardShellProps } from "@/lib/dashboard/shell-props";

/**
 * Marketplace pages (/teachers, /classes, /courses, /exams) are public —
 * signed-out visitors see them with the site's public header. But a signed-in
 * parent or teacher browsing the catalog should keep their dashboard sidebar
 * so they don't feel ejected from their workspace; a non-parent role
 * (teacher/admin) still gets their own shell for consistency.
 *
 * We fetch the shell props once at layout level; if the visitor is signed
 * out we fall through to the root layout's public chrome.
 */
export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await getDashboardShellProps();
  if (!shell) return <>{children}</>;

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
