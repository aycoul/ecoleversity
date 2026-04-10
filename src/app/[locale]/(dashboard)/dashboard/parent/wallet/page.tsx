import { getTranslations } from "next-intl/server";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { ReferralCard } from "@/components/wallet/referral-card";

export default async function WalletPage() {
  const t = await getTranslations("wallet");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
      <WalletDashboard />
      <ReferralCard />
    </div>
  );
}
