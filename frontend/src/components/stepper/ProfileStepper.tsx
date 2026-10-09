import React from 'react';
import { StepNumber, STEP_DEFINITIONS } from '../../types/profile';
import './ProfileStepper.css';

interface ProfileStepperProps {
  currentStep: StepNumber;
  completedSteps: StepNumber[];
  onStepClick: (step: StepNumber) => void;
  isSaving?: boolean;
}

export const ProfileStepper: React.FC<ProfileStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  // Calculate completion percentage: each completed step is 20%
  const percentage = Math.round((completedSteps.length / 5) * 100);

  return (
    <div className="stepper-container" role="navigation" aria-label="Profile registration steps">
      <div className="stepper-header">
        <div className="stepper-header-title">
          <span className="stepper-badge">Section 3 Form</span>
          <span className="stepper-title-text">
            Step {currentStep} of 5 — {STEP_DEFINITIONS[currentStep - 1].title}
          </span>
        </div>
        <div className="stepper-percentage-badge">
          {percentage}% Complete
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-track" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${Math.max(percentage, 5)}%` }} />
      </div>

      {/* Stepper Cards */}
      <div className="stepper-steps-wrapper">
        {STEP_DEFINITIONS.map((def) => {
          const isCompleted = completedSteps.includes(def.number);
          const isActive = currentStep === def.number;
          // Step is clickable if it is already completed, currently active, or the immediately next available step
          const isClickable =
            isCompleted ||
            isActive ||
            def.number <= Math.max(...completedSteps, 1) + 1;

          let statusClass = 'pending';
          if (isCompleted) statusClass = 'completed';
          if (isActive) statusClass = 'active';

          return (
            <div
              key={def.number}
              className={`step-card ${statusClass} ${isClickable ? 'clickable' : 'locked'}`}
              onClick={() => {
                if (isClickable) {
                  onStepClick(def.number);
                }
              }}
              title={
                isClickable
                  ? `Jump to Step ${def.number}: ${def.title}`
                  : `Complete preceding steps to unlock Step ${def.number}`
              }
              role="button"
              tabIndex={isClickable ? 0 : -1}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{def.number}</span>
                )}
              </div>

              <div className="step-info">
                <span className="step-number-tag">Step {def.number}</span>
                <span className="step-title">{def.shortTitle}</span>
                <span className="step-subtitle">{def.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
