import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole =
    role === "parent" || role === "teacher" ? role : undefined;

  return <RegisterForm initialRole={initialRole} />;
}
