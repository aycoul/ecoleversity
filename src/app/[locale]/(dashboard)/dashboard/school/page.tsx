import { redirect } from "next/navigation";

export default function SchoolAdminRedirectPage() {
  redirect("/dashboard/admin");
}
