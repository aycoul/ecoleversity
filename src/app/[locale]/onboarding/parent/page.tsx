"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { StepWizard } from "@/components/onboarding/step-wizard";
import { WelcomeStep } from "@/components/onboarding/parent/welcome-step";
import { AddChildStep } from "@/components/onboarding/parent/add-child-step";
import type { ChildProfile } from "@/components/onboarding/parent/add-child-step";
import { RecommendationsStep } from "@/components/onboarding/parent/recommendations-step";
import { DashboardTourStep } from "@/components/onboarding/parent/dashboard-tour-step";

const TOTAL_STEPS = 4;

export default function ParentOnboardingPage() {
  const t = useTranslations("onboarding.parent");
  const [currentStep, setCurrentStep] = useState(1);
  const [children, setChildren] = useState<ChildProfile[]>([]);

  const handleChildAdded = useCallback((child: ChildProfile) => {
    setChildren((prev) => [...prev, child]);
  }, []);

  const handleChildRemoved = useCallback((childId: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== childId));
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

  const canGoNext = (() => {
    switch (currentStep) {
      case 1: // Welcome — always allowed
        return true;
      case 2: // Add child — must have at least one child
        return children.length > 0;
      case 3: // Recommendations — informational
        return true;
      case 4: // Dashboard tour — last step
        return true;
      default:
        return true;
    }
  })();

  const stepLabel = t("step", { current: currentStep, total: TOTAL_STEPS });

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return (
          <AddChildStep
            childList={children}
            onChildAdded={handleChildAdded}
            onChildRemoved={handleChildRemoved}
          />
        );
      case 3:
        return <RecommendationsStep childList={children} />;
      case 4:
        return <DashboardTourStep />;
      default:
        return null;
    }
  };

  return (
    <StepWizard
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      stepLabel={stepLabel}
      onNext={goNext}
      onPrevious={goPrevious}
      canGoNext={canGoNext}
      canGoPrevious={currentStep > 1}
      isLastStep={currentStep === TOTAL_STEPS}
    >
      {renderStep()}
    </StepWizard>
  );
}
