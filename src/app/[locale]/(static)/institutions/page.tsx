"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import {
  Building2,
  Users,
  Shield,
  BarChart3,
  CheckCircle2,
  Loader2,
  School,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

const INSTITUTION_TYPES = [
  { value: "private_school", icon: School, labelKey: "typeSchool" },
  { value: "tutoring_center", icon: BookOpen, labelKey: "typeCenter" },
  { value: "academy", icon: GraduationCap, labelKey: "typeAcademy" },
] as const;

export default function InstitutionsPage() {
  const t = useTranslations("institutions");

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [teacherCount, setTeacherCount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type || !contactName || !contactEmail || !contactPhone || !city || !teacherCount) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/institutions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          contactName,
          contactEmail,
          contactPhone,
          city,
          teacherCount: parseInt(teacherCount, 10),
          message: message || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success(t("success"));
      } else {
        const json = await res.json();
        toast.error(json.error ?? t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto mb-6 size-16 text-[var(--ev-green)]" />
        <h1 className="text-3xl font-bold text-[var(--ev-blue)]">{t("successTitle")}</h1>
        <p className="mt-4 text-lg text-slate-600">{t("successMessage")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-[var(--ev-blue-50)]">
          <Building2 className="size-8 text-[var(--ev-blue)]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--ev-blue)]">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          {t("subtitle")}
        </p>
      </div>

      {/* Benefits */}
      <div className="mb-12 grid gap-6 sm:grid-cols-3">
        {[
          { icon: Users, titleKey: "benefitTeachers", descKey: "benefitTeachersDesc" },
          { icon: Shield, titleKey: "benefitVisibility", descKey: "benefitVisibilityDesc" },
          { icon: BarChart3, titleKey: "benefitDashboard", descKey: "benefitDashboardDesc" },
        ].map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-[var(--ev-amber)]/10 text-[var(--ev-amber)]">
              <Icon className="size-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">{t(titleKey)}</h3>
            <p className="mt-1 text-sm text-slate-600">{t(descKey)}</p>
          </div>
        ))}
      </div>

      {/* Registration Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-[var(--ev-blue)]">{t("formTitle")}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Institution name */}
          <div>
            <Label htmlFor="name">{t("fieldName")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fieldNamePlaceholder")} required />
          </div>

          {/* Type selector */}
          <div>
            <Label>{t("fieldType")}</Label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {INSTITUTION_TYPES.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    type === value
                      ? "border-[var(--ev-blue)] bg-[var(--ev-blue-50)] text-[var(--ev-blue)]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="text-sm font-semibold">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contactName">{t("fieldContactName")}</Label>
              <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="contactEmail">{t("fieldEmail")}</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="contactPhone">{t("fieldPhone")}</Label>
              <Input id="contactPhone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="07 XX XX XX XX" required />
            </div>
            <div>
              <Label htmlFor="city">{t("fieldCity")}</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Abidjan" required />
            </div>
          </div>

          {/* Teacher count */}
          <div>
            <Label htmlFor="teacherCount">{t("fieldTeacherCount")}</Label>
            <Input id="teacherCount" type="number" min="1" value={teacherCount} onChange={(e) => setTeacherCount(e.target.value)} placeholder="5" required />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">{t("fieldMessage")}</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("fieldMessagePlaceholder")} rows={3} />
          </div>

          <Button
            type="submit"
            disabled={submitting || !name || !type || !contactName || !contactEmail || !contactPhone || !city || !teacherCount}
            className="w-full rounded-xl bg-[var(--ev-amber)] py-6 text-lg font-bold text-white hover:bg-[var(--ev-amber-light)]"
          >
            {submitting && <Loader2 className="mr-2 size-5 animate-spin" />}
            {t("submitButton")}
          </Button>
        </form>
      </div>
    </div>
  );
}
