"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Video, Mic, Wifi, ExternalLink } from "lucide-react";

export function JitsiTestStep() {
  const t = useTranslations("onboarding.teacher");

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [internetOk, setInternetOk] = useState(false);

  const openTestRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    window.open(`https://meet.jit.si/ecoleversity-test-${roomId}`, "_blank");
  };

  const checks = [
    { label: "Ma cam\u00e9ra fonctionne", checked: cameraOk, toggle: () => setCameraOk(!cameraOk), icon: <Video className="size-4" /> },
    { label: "Mon micro fonctionne", checked: micOk, toggle: () => setMicOk(!micOk), icon: <Mic className="size-4" /> },
    { label: "Ma connexion est stable", checked: internetOk, toggle: () => setInternetOk(!internetOk), icon: <Wifi className="size-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("jitsiTitle")}</h2>
        <p className="text-sm text-slate-500">{t("jitsiDesc")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-100 bg-white p-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
          <Video className="size-8 text-emerald-600" />
        </div>
        <Button
          onClick={openTestRoom}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          size="lg"
        >
          Tester ma cam&eacute;ra et mon micro
          <ExternalLink className="ml-2 size-4" data-icon="inline-end" />
        </Button>
        <p className="text-xs text-slate-400">
          Un salon de test Jitsi s&apos;ouvrira dans un nouvel onglet
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">
          Confirmez que tout fonctionne :
        </p>
        {checks.map((check, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              check.checked
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={check.checked}
              onChange={check.toggle}
              className="sr-only"
            />
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                check.checked
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-300"
              }`}
            >
              {check.checked && (
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className={`flex items-center gap-2 text-sm ${check.checked ? "text-emerald-700" : "text-slate-700"}`}>
              {check.icon}
              {check.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
