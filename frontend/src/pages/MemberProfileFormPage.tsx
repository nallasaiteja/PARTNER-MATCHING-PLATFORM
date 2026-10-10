import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfileForm } from '../hooks/useProfileForm';
import { ProfileStepper } from '../components/stepper/ProfileStepper';
import { Step1PersonalDetails } from '../components/profile-form/Step1PersonalDetails';
import { Step2EducationProfessional } from '../components/profile-form/Step2EducationProfessional';
import { Step3FamilyDetails } from '../components/profile-form/Step3FamilyDetails';
import { Step4PartnerPreferences } from '../components/profile-form/Step4PartnerPreferences';
import { Step5VerificationSettings } from '../components/profile-form/Step5VerificationSettings';
import { STEP_DEFINITIONS, StepNumber } from '../types/profile';
import './MemberProfileFormPage.css';

export const MemberProfileFormPage: React.FC = () => {
  const { profileId } = useParams<{ profileId?: string }>();
  const navigate = useNavigate();
  const [isCompletedSubmitted, setIsCompletedSubmitted] = useState<boolean>(false);

  const {
    formData,
    currentStep,
    completedSteps,
    errors,
    isLoading,
    isDirty,
    saveStatus,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    saveDraft,
  } = useProfileForm(profileId);

  const handleNext = async () => {
    if (currentStep === 5) {
      // Final submission
      const success = await nextStep();
      if (success) {
        setIsCompletedSubmitted(true);
      }
    } else {
      await nextStep();
    }
  };

  const handleManualSave = async () => {
    await saveDraft();
  };

  if (isLoading) {
    return (
      <div className="profile-form-page-container">
        <div className="loading-skeleton">
          <p>Loading member profile data...</p>
        </div>
      </div>
    );
  }

  if (isCompletedSubmitted) {
    return (
      <div className="profile-form-page-container">
        <div className="profile-success-card">
          <div className="success-icon-badge">✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Member Profile Successfully Completed!
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
            All 5 steps of Section 3 have been completed and saved. Profile data is preserved
            and queued for admin verification and partner matching.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              className="btn-nav btn-nav-prev"
              onClick={() => {
                setIsCompletedSubmitted(false);
                goToStep(1);
              }}
            >
              Review / Edit Profile
            </button>
            <button
              className="btn-nav btn-nav-next"
              onClick={() => navigate(-1)}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nextDef = currentStep < 5 ? STEP_DEFINITIONS[currentStep] : null;

  return (
    <div className="profile-form-page-container">
      {/* Top Header */}
      <div className="profile-form-header">
        <div className="profile-form-title-group">
          <h1>Member Profile Data Entry</h1>
          <p>Section 3 — 5-Step Member Registration & Profiling Architecture</p>
        </div>

        <div className="profile-header-meta">
          <span className="profile-id-chip">
            {formData.memberId || formData.id || 'New Draft Profile'}
          </span>

          <div className={`save-indicator ${saveStatus.status}`}>
            <span className="save-indicator-dot" />
            <span>
              {saveStatus.status === 'saving' && 'Saving...'}
              {saveStatus.status === 'saved' && (isDirty ? 'Unsaved changes' : 'Saved')}
              {saveStatus.status === 'idle' && (isDirty ? 'Draft modified' : 'Up to date')}
              {saveStatus.status === 'error' && (saveStatus.errorMessage || 'Save error')}
            </span>
          </div>

          <button
            type="button"
            className="btn-nav btn-nav-draft"
            onClick={handleManualSave}
            title="Save current progress immediately"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* 5-Step Navigation UI */}
      <ProfileStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step: StepNumber) => goToStep(step)}
        isSaving={saveStatus.status === 'saving'}
      />

      {/* Active Step Panel */}
      <div className="step-content-area">
        {currentStep === 1 && (
          <Step1PersonalDetails
            data={formData.step1}
            onChange={(field, val) => updateField(1, field, val)}
            errors={errors}
            immutableFields={formData.id
              ? ['firstName', 'lastName', 'mobile', 'email', 'dateOfBirth', 'religion', 'caste']
              : []}
          />
        )}

        {currentStep === 2 && (
          <Step2EducationProfessional
            data={formData.step2}
            onChange={(field, val) => updateField(2, field, val)}
            errors={errors}
          />
        )}

        {currentStep === 3 && (
          <Step3FamilyDetails
            data={formData.step3}
            onChange={(field, val) => updateField(3, field, val)}
            errors={errors}
          />
        )}

        {currentStep === 4 && (
          <Step4PartnerPreferences
            data={formData.step4}
            onChange={(field, val) => updateField(4, field, val)}
            errors={errors}
          />
        )}

        {currentStep === 5 && (
          <Step5VerificationSettings
            data={formData.step5}
            onChange={(field, val) => updateField(5, field, val)}
            errors={errors}
            profileId={formData.id}
            profileUserId={formData.userId}
            registeredEmail={formData.step1.email}
            idProofUrl={formData.step1.idProofFileUrl}
            packageType={formData.packageType}
            onIdProofUploaded={(url) => {
              updateField(1, 'idProofFileUrl', url);
              updateField(5, 'idProofUploaded', true);
            }}
          />
        )}
      </div>

      {/* Navigation Footer */}
      <div className="form-action-bar">
        <button
          type="button"
          className="btn-nav btn-nav-prev"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          ← Previous Step
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-nav btn-nav-draft"
            onClick={handleManualSave}
          >
            Save & Continue Later
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              className="btn-nav btn-nav-next"
              onClick={handleNext}
            >
              Next: Step {currentStep + 1} ({nextDef?.shortTitle}) →
            </button>
          ) : (
            <button
              type="button"
              className="btn-nav btn-nav-submit"
              onClick={handleNext}
            >
              Complete Profile ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberProfileFormPage;
