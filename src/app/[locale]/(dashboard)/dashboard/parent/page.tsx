import { redirect } from "next/navigation";

export default function ParentDashboardRoot() {
  redirect("/dashboard/parent/overview");
}
