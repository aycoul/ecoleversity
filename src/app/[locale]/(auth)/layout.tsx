import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-[var(--ev-blue-50)] to-white px-4 py-8">
      <Link href="/" className="mb-8">
        <Image
          src="/logo.png"
          alt="écoleVersity"
          width={220}
          height={56}
          className="h-14 w-auto"
          priority
        />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
