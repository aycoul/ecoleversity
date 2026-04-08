"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { WelcomeStep } from "@/components/onboarding/teacher/welcome-step";
import { ProfileStep } from "@/components/onboarding/teacher/profile-step";
import { VerificationStep } from "@/components/onboarding/teacher/verification-step";
import { FirstCourseStep } from "@/components/onboarding/teacher/first-course-step";
import { JitsiTestStep } from "@/components/onboarding/teacher/jitsi-test-step";
import { PayoutStep } from "@/components/onboarding/teacher/payout-step";
import { ReadyStep } from "@/components/onboarding/teacher/ready-step";

const TOTAL_STEPS = 7;

export default function TeacherOnboardingPage() {
  const t = useTranslations("onboarding.teacher");
  const [currentStep, setCurrentStep] = useState(1);

  // Track which steps have been "saved" (for steps that require data persistence)
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());

  const markSaved = useCallback((step: number) => {
    setSavedSteps((prev) => new Set(prev).add(step));
  }, []);

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  // Determine if "Next" is allowed for the current step
  const canGoNext = (() => {
    switch (currentStep) {
      case 1: // Welcome — always allowed
      case 4: // First course tips — informational
      case 5: // Jitsi test — manual checks, not blocking
        return true;
      case 2: // Profile — must be saved
        return savedSteps.has(2);
      case 3: // Verification — must be saved
        return savedSteps.has(3);
      case 6: // Payout — must be saved
        return savedSteps.has(6);
      case 7: // Ready — last step
        return true;
      default:
        return true;
    }
  })();

  // Steps that save data call onSaved which both marks saved and advances
  const handleProfileSaved = useCallback(() => {
    markSaved(2);
    setCurrentStep(3);
  }, [markSaved]);

  const handleVerificationSaved = useCallback(() => {
    markSaved(3);
    setCurrentStep(4);
  }, [markSaved]);

  const handlePayoutSaved = useCallback(() => {
    markSaved(6);
    setCurrentStep(7);
  }, [markSaved]);

  const handleNext = () => {
    // For steps that need saving, trigger save instead of just advancing
    // The save callback will advance once done
    switch (currentStep) {
      case 2:
        // ProfileStep save is triggered by its own internal button via onSaved
        // If already saved, just go next
        if (savedSteps.has(2)) goNext();
        break;
      case 3:
        if (savedSteps.has(3)) goNext();
        break;
      case 6:
        if (savedSteps.has(6)) goNext();
        break;
      default:
        goNext();
    }
  };

  const stepLabel = t("step", { current: currentStep, total: TOTAL_STEPS });

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return <ProfileStep onSaved={handleProfileSaved} />;
      case 3:
        return <VerificationStep onSaved={handleVerificationSaved} />;
      case 4:
        return <FirstCourseStep />;
      case 5:
        return <JitsiTestStep />;
      case 6:
        return <PayoutStep onSaved={handlePayoutSaved} />;
      case 7:
        return <ReadyStep />;
      default:
        return null;
    }
  };

  return (
    <StepWizard
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      stepLabel={stepLabel}
      onNext={handleNext}
      onPrevious={goPrevious}
      canGoNext={canGoNext}
      canGoPrevious={currentStep > 1}
      isLastStep={currentStep === TOTAL_STEPS}
    >
      {renderStep()}
    </StepWizard>
  );
}
