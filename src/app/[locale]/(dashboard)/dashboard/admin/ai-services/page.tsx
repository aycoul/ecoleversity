import { redirect } from "next/navigation";

/**
 * The old Services IA page was merged into Paramètres IA (one page with
 * teachers + parents + revenue config instead of two overlapping pages).
 * Keep this redirect so any old bookmarks still land somewhere useful.
 */
export default function DeprecatedAiServicesPage() {
  redirect("/dashboard/admin/ai-settings");
}
