import type { StepDTO, StepType } from "@/domain/types";
import { STEP_ORDER } from "@/domain/types";

// ─────────────────────────────────────────────
// Calculates case progress percentage
// ─────────────────────────────────────────────

export function calculateProgress(steps: StepDTO[]): number {
  if (steps.length === 0) return 0;

  const completedCount = steps.filter((s) => s.status === "COMPLETED").length;
  return Math.round((completedCount / STEP_ORDER.length) * 100);
}

// ─────────────────────────────────────────────
// Returns the current active step
// ─────────────────────────────────────────────

export function getCurrentStep(steps: StepDTO[]): StepType | null {
  const stepMap = Object.fromEntries(steps.map((s) => [s.type, s]));

  // Find the first step that is not completed
  for (const stepType of STEP_ORDER) {
    const step = stepMap[stepType];
    if (!step || step.status !== "COMPLETED") {
      return stepType;
    }
  }

  // All steps completed
  return null;
}

// ─────────────────────────────────────────────
// Returns the next step after a given step
// ─────────────────────────────────────────────

export function getNextStep(currentType: StepType): StepType | null {
  const idx = STEP_ORDER.indexOf(currentType);
  if (idx === -1 || idx === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[idx + 1];
}

// ─────────────────────────────────────────────
// Determines which steps are accessible (not hard-blocked)
// ─────────────────────────────────────────────

export function getAccessibleSteps(steps: StepDTO[]): Set<StepType> {
  const accessible = new Set<StepType>();
  const stepMap = Object.fromEntries(steps.map((s) => [s.type, s]));

  for (let i = 0; i < STEP_ORDER.length; i++) {
    const stepType = STEP_ORDER[i];
    const step = stepMap[stepType];

    if (i === 0) {
      accessible.add(stepType);
      continue;
    }

    const prevStepType = STEP_ORDER[i - 1];
    const prevStep = stepMap[prevStepType];

    if (prevStep?.status === "COMPLETED") {
      accessible.add(stepType);
    }

    // Always allow accessing completed steps
    if (step?.status === "COMPLETED") {
      accessible.add(stepType);
    }
  }

  return accessible;
}
