"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Video,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";

type VerificationStepProps = {
  onSaved: () => void;
};

type UploadStatus = "idle" | "uploading" | "done" | "error";

export function VerificationStep({ onSaved }: VerificationStepProps) {
  const t = useTranslations("onboarding.teacher");

  const [cniStatus, setCniStatus] = useState<UploadStatus>("idle");
  const [diplomaStatus, setDiplomaStatus] = useState<UploadStatus>("idle");
  const [videoStatus, setVideoStatus] = useState<UploadStatus>("idle");

  const [cniName, setCniName] = useState("");
  const [diplomaName, setDiplomaName] = useState("");
  const [videoName, setVideoName] = useState("");

  const uploadFile = async (
    file: File,
    folder: string,
    field: string,
    setStatus: (s: UploadStatus) => void,
    setName: (n: string) => void
  ) => {
    setStatus("uploading");
    setName(file.name);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const ext = file.name.split(".").pop();
      const path = `${folder}/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("teacher-documents")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("teacher-documents")
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from("teacher_profiles")
        .update({ [field]: urlData.publicUrl })
        .eq("user_id", user.id);
      if (dbError) throw dbError;

      setStatus("done");
    } catch (err) {
      setStatus("error");
      toast.error(err instanceof Error ? err.message : "Erreur lors du téléchargement");
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    field: string,
    setStatus: (s: UploadStatus) => void,
    setName: (n: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, folder, field, setStatus, setName);
  };

  const allDone = cniStatus === "done" && diplomaStatus === "done";

  const renderUploadArea = (
    id: string,
    label: string,
    accept: string,
    status: UploadStatus,
    fileName: string,
    icon: React.ReactNode,
    folder: string,
    field: string,
    setStatus: (s: UploadStatus) => void,
    setName: (n: string) => void
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <label
        htmlFor={id}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          status === "done"
            ? "border-emerald-300 bg-emerald-50"
            : status === "error"
            ? "border-red-300 bg-red-50"
            : status === "uploading"
            ? "border-slate-300 bg-slate-50"
            : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/50"
        }`}
      >
        {status === "uploading" && (
          <>
            <Loader2 className="size-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">T&eacute;l&eacute;chargement...</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700">{fileName}</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="size-8 text-red-400" />
            <p className="text-sm text-red-600">Erreur — cliquez pour r&eacute;essayer</p>
          </>
        )}
        {status === "idle" && (
          <>
            {icon}
            <p className="text-sm text-slate-500">
              Cliquez pour s&eacute;lectionner un fichier
            </p>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(e, folder, field, setStatus, setName)}
        className="hidden"
        disabled={status === "uploading"}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{t("verificationTitle")}</h2>
        <p className="text-sm text-slate-500">{t("verificationDesc")}</p>
      </div>

      {renderUploadArea(
        "cni-upload",
        t("uploadCNI"),
        "image/*,.pdf",
        cniStatus,
        cniName,
        <FileText className="size-8 text-slate-400" />,
        "cni",
        "id_document_url",
        setCniStatus,
        setCniName
      )}

      {renderUploadArea(
        "diploma-upload",
        t("uploadDiploma"),
        "image/*,.pdf",
        diplomaStatus,
        diplomaName,
        <Upload className="size-8 text-slate-400" />,
        "diplomas",
        "diploma_url",
        setDiplomaStatus,
        setDiplomaName
      )}

      {renderUploadArea(
        "video-upload",
        t("recordVideo"),
        "video/*",
        videoStatus,
        videoName,
        <Video className="size-8 text-slate-400" />,
        "videos",
        "video_intro_url",
        setVideoStatus,
        setVideoName
      )}

      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <AlertCircle className="mb-1 inline-block size-4" /> {t("verificationPending")}
      </div>

      {allDone && (
        <Button
          onClick={onSaved}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Continuer
        </Button>
      )}
    </div>
  );
}
