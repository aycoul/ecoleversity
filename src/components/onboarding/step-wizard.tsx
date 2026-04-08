"use client";

import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type StepWizardProps = {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep: boolean;
  children: React.ReactNode;
};

export function StepWizard({
  currentStep,
  totalSteps,
  stepLabel,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  isLastStep,
  children,
}: StepWizardProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress header */}
      <div className="space-y-2">
        <Progress value={percentage} className="[&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-track]]:h-2">
          <ProgressLabel className="text-sm font-medium text-slate-700">
            {stepLabel}
          </ProgressLabel>
          <ProgressValue className="text-sm text-slate-500" />
        </Progress>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{children}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={!canGoPrevious ? "invisible" : ""}
        >
          <ArrowLeft className="mr-1.5 size-4" data-icon="inline-start" />
          Pr&eacute;c&eacute;dent
        </Button>

        <Button
          onClick={onNext}
          disabled={!canGoNext}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {isLastStep ? (
            <>
              Terminer
              <Check className="ml-1.5 size-4" data-icon="inline-end" />
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="ml-1.5 size-4" data-icon="inline-end" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
