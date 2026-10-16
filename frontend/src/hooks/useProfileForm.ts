/**
 * useProfileForm Hook
 * Core state management, step navigation, validation, and persistence for Section 3 (5-step form).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StepNumber,
  MemberProfileFormData,
  StepValidationErrors,
  SaveStatusState,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
} from '../types/profile';
import { validateStep, validateAllSteps } from '../utils/stepValidation';
import {
  createProfile,
  updateProfile,
  fetchProfileById,
  fetchMyProfile,
} from '../services/profileApi';

const DEFAULT_STEP_1: Step1Data = {
  firstName: '',
  lastName: '',
  gender: '',
  mobile: '',
  email: '',
  dateOfBirth: '',
  timeOfBirth: '',
  birthPlace: '',
  idProofType: 'Aadhar Card',
  idProofNumber: '',
  country: '',
  state: '',
  religion: '',
  caste: '',
  maritalStatus: 'Unmarried',
  height: '',
  bloodGroup: '',
  motherTongue: '',
  healthCondition: '',
  complexion: '',
  smoke: false,
  drink: false,
  foodPreference: '',
  aboutMe: '',
  hobbies: '',
  spokenLanguages: [],

  // Marital History
  dateOfMarriage: '',
  dateOfDivorce: '',
  divorceReason: '',
  divorceCertificateUrl: '',
  dateOfSpouseDeath: '',
  deathCertificateUrl: '',
  havingChildren: false,
  sons: [],
  daughters: [],

  // Current Living Address
  currentCountry: '',
  currentState: '',
  currentDistrict: '',
  currentCity: '',
  currentVillage: '',
  currentAddress: '',

  // Contact & Application Meta
  alternateMobile: '',
  alternateEmail: '',
  bestTimeToCall: 'Anytime',
  applicationFor: 'Myself',
  fillerName: '',
  fillerMobile: '',
  fillerRelation: '',
  source: '',
  nearestBranch: '',
};

const DEFAULT_STEP_2: Step2Data = {
  education: '',
  university: '',
  employedIn: '',
  currentEducationPursuing: '',
  universityStudying: '',
  universityAddress: '',
  yearOfPursuing: '',
  profession: '',
  designation: '',
  workingLocation: 'India',
  workingState: '',
  workingCity: '',
  workingLocationAddress: '',
  companyName: '',
  workingSince: '',
  totalExperience: '',
  passportNumber: '',
  workCountry: '',
  workState: '',
  visaType: '',
  abroadPassportNumber: '',
  passportValidFrom: '',
  passportValidTill: '',
  abroadCompanyName: '',
  abroadCompanyAddress: '',
  annualIncome: '',
  propertyDetails: '',
  colleagueName: '',
  colleagueMobile: '',
};

const DEFAULT_STEP_3: Step3Data = {
  fatherName: '',
  fatherReligion: '',
  fatherCaste: '',
  fatherCasteConverted: false,
  fatherStatus: 'Alive',
  fatherHealthCondition: '',
  fatherMobile: '',
  fatherEmployment: '',
  fatherProfession: '',
  fatherAnnualIncome: '',
  fatherDesignation: '',
  fatherAddress: '',
  fatherProperty: '',
  fatherPension: '',

  motherName: '',
  motherMaidenName: '',
  motherReligion: '',
  motherCaste: '',
  motherCasteConverted: false,
  motherStatus: 'Alive',
  motherHealthCondition: '',
  motherWorkingSector: '',
  motherMobile: '',
  motherEmployment: '',
  motherProfession: '',
  motherAnnualIncome: '',
  motherDesignation: '',
  motherAddress: '',
  motherProperty: '',
  motherPension: '',

  familyPermanentAddress: '',
  familyPresentAddress: '',
  numberOfBrothers: 0,
  brothers: [],
  numberOfSisters: 0,
  sisters: [],
  referenceName: '',
  referenceMobile: '',
  referenceRelation: '',
  referenceAddress: '',
  familyType: 'Nuclear Family',
  familyStatus: 'Middle Class',
};

const DEFAULT_STEP_4: Step4Data = {
  preferredMaritalStatus: ['Unmarried'],
  ageRangeMin: 21,
  ageRangeMax: 28,
  heightRangeMin: "5'0\"",
  heightRangeMax: "6'0\"",
  interCasteAllowed: false,
  preferredCastes: [],
  preferredFamilyStatus: [],
  preferredCountriesAbroad: [],
  preferredProfession: [],
  preferredCitiesOfWork: [],
  preferredEducation: [],
  preferredComplexion: [],
};

const DEFAULT_STEP_5: Step5Data = {
  mobileVerified: false,
  emailVerified: false,
  idProofUploaded: false,
  idProofVerified: false,
  willingToTakePackage: true,
  mobileRevelationPreference: '0 Hours',
};

const INITIAL_FORM_DATA: MemberProfileFormData = {
  currentStep: 1,
  completedSteps: [],
  step1: DEFAULT_STEP_1,
  step2: DEFAULT_STEP_2,
  step3: DEFAULT_STEP_3,
  step4: DEFAULT_STEP_4,
  step5: DEFAULT_STEP_5,
};

export function useProfileForm(profileId?: string) {
  const [formData, setFormData] = useState<MemberProfileFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<StepValidationErrors>({});
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>({
    status: 'idle',
    lastSavedAt: null,
  });

  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(profileId);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load initial data (Remote Backend or Local Draft) ───────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      let effectiveId = profileId;
      let remote: any = null;

      // 1. If explicit profileId passed, fetch that
      if (profileId) {
        try {
          remote = await fetchProfileById(profileId);
          if (remote?.id) effectiveId = remote.id;
        } catch (err) {
          console.warn('Could not load profile by id:', err);
        }
      } else {
        // 2. Otherwise fetch logged-in member's profile
        try {
          remote = await fetchMyProfile();
          if (remote?.id) {
            effectiveId = remote.id;
          }
        } catch (err) {
          console.warn('Could not fetch member profile from /profiles/me:', err);
          const stored = localStorage.getItem('memberProfile');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed?.id) {
                effectiveId = parsed.id;
                try {
                  remote = await fetchProfileById(parsed.id);
                } catch (e) {}
              }
            } catch (e) {}
          }
        }
      }

      if (effectiveId && isMounted) {
        setActiveProfileId(effectiveId);
      }

      const activeKey = `pmp_member_draft_${effectiveId || 'new'}`;
      const localDraft = localStorage.getItem(activeKey);
      let parsedLocal: MemberProfileFormData | null = null;
      if (localDraft) {
        try {
          const localData = JSON.parse(localDraft);
          const legacyPaymentInterestDate =
            localData?.step4?.paymentInterestDate ?? localData?.step5?.paymentInterestDate;
          parsedLocal = {
            ...localData,
            step4: {
              ...DEFAULT_STEP_4,
              ...(localData?.step4 || {}),
              ...(legacyPaymentInterestDate ? { paymentInterestDate: legacyPaymentInterestDate } : {}),
            },
          };
        } catch (e) {
          console.warn('Failed to parse local draft:', e);
        }
      }

      if (remote && isMounted) {
        const remoteStepData = (remote.profileData as any) || {};

        const merged: MemberProfileFormData = {
          id: remote.id,
          memberId: remote.memberId || undefined,
          userId: remote.userId,
          packageType: remote.packageType || parsedLocal?.packageType || 'FREE',
          currentStep: (remote.currentStep as StepNumber) || parsedLocal?.currentStep || 1,
          completedSteps: (remote.completedSteps as StepNumber[]) || parsedLocal?.completedSteps || [],
          step1: {
            ...DEFAULT_STEP_1,
            firstName: remote.firstName || '',
            lastName: remote.lastName || '',
            gender: remote.gender || '',
            mobile: remote.user?.mobile || remote.mobile || '',
            email: remote.user?.email || remote.email || '',
            dateOfBirth: remote.dateOfBirth ? remote.dateOfBirth.split('T')[0] : '',
            idProofType: remote.idProofType || 'Aadhar Card',
            idProofNumber: remote.idProofNumber || '',
            timeOfBirth: remote.timeOfBirth || '',
            birthPlace: remote.birthPlace || '',
            photoUrl: remote.photoUrl || '',
            idProofFileUrl: remote.idProofFileUrl || '',
            ...(remoteStepData.step1 || {}),
            ...(parsedLocal?.step1 || {}),
          },
          step2: {
            ...DEFAULT_STEP_2,
            ...(remoteStepData.step2 || {}),
            ...(parsedLocal?.step2 || {}),
          },
          step3: {
            ...DEFAULT_STEP_3,
            ...(remoteStepData.step3 || {}),
            ...(parsedLocal?.step3 || {}),
          },
          step4: {
            ...DEFAULT_STEP_4,
            ...(remoteStepData.step4 || {}),
            ...(parsedLocal?.step4 || {}),
            paymentInterestDate:
              parsedLocal?.step4?.paymentInterestDate ??
              parsedLocal?.step5?.paymentInterestDate ??
              remoteStepData.step4?.paymentInterestDate ??
              remoteStepData.step5?.paymentInterestDate,
          },
          step5: {
            ...DEFAULT_STEP_5,
            ...(remoteStepData.step5 || {}),
            ...(parsedLocal?.step5 || {}),
            mobileVerified: remote.user?.mobileVerified ?? remoteStepData.step5?.mobileVerified ?? false,
            emailVerified: remote.user?.emailVerified ?? remoteStepData.step5?.emailVerified ?? false,
            idProofUploaded: Boolean(remote.idProofFileUrl || remoteStepData.step5?.idProofUploaded),
            idProofVerified: Boolean(remoteStepData.step5?.idProofVerified),
            idProofStatus:
              remoteStepData.step5?.idProofStatus ||
              (remote.idProofFileUrl ? 'PENDING_REVIEW' : 'NOT_UPLOADED'),
          },
        };

        // Dynamically compute truly valid completed steps
        const validSteps: StepNumber[] = [];
        for (let s = 1; s <= 5; s++) {
          const errs = validateStep(s as StepNumber, merged);
          if (Object.keys(errs).length === 0) {
            validSteps.push(s as StepNumber);
          }
        }
        merged.completedSteps = validSteps;

        setFormData(merged);
        setIsLoading(false);
        return;
      }

      // If no remote profile found or backend failed, fallback to local draft
      if (isMounted) {
        if (parsedLocal) {
          setFormData(parsedLocal);
        } else {
          setFormData(INITIAL_FORM_DATA);
        }
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [profileId]);

  // ─── Auto-cache to localStorage on change ─────────────────────────────────
  const cacheLocally = useCallback(
    (data: MemberProfileFormData) => {
      try {
        const key = `pmp_member_draft_${data.id || activeProfileId || profileId || 'new'}`;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache draft locally:', e);
      }
    },
    [activeProfileId, profileId],
  );

  // ─── Update Field ────────────────────────────────────────────────────────
  const updateField = useCallback(
    (stepNumber: StepNumber, fieldName: string, value: any) => {
      setFormData((prev) => {
        const stepKey = `step${stepNumber}` as keyof Pick<
          MemberProfileFormData,
          'step1' | 'step2' | 'step3' | 'step4' | 'step5'
        >;

        const updatedStep = {
          ...prev[stepKey],
          [fieldName]: value,
        };

        const updatedData = {
          ...prev,
          [stepKey]: updatedStep,
        };

        cacheLocally(updatedData);
        return updatedData;
      });

      setIsDirty(true);

      // Clear field error and alert
      setErrors((prev) => {
        if (!prev[fieldName]) return prev;
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
      setValidationAlert(null);
    },
    [cacheLocally],
  );

  // ─── Save Draft to Backend ────────────────────────────────────────────────
  const saveDraft = useCallback(
    async (overrideData?: MemberProfileFormData, isFinalSubmit?: boolean): Promise<boolean> => {
      const dataToSave = overrideData || formData;
      setSaveStatus((prev) => ({ ...prev, status: 'saving', errorMessage: undefined }));

      try {
        const stepPayload = {
          step1: dataToSave.step1,
          step2: dataToSave.step2,
          step3: dataToSave.step3,
          step4: dataToSave.step4,
          step5: dataToSave.step5,
        };

        const targetId = dataToSave.id || activeProfileId;

        if (targetId) {
          // Update existing profile
          const updated = await updateProfile(targetId, {
            firstName: dataToSave.step1.firstName || undefined,
            lastName: dataToSave.step1.lastName || undefined,
            gender: dataToSave.step1.gender || undefined,
            mobile: dataToSave.step1.mobile || undefined,
            email: dataToSave.step1.email || undefined,
            dateOfBirth: dataToSave.step1.dateOfBirth || undefined,
            currentStep: dataToSave.currentStep,
            completedSteps: dataToSave.completedSteps,
            idProofType: dataToSave.step1.idProofType,
            idProofNumber: dataToSave.step1.idProofNumber,
            timeOfBirth: dataToSave.step1.timeOfBirth,
            birthPlace: dataToSave.step1.birthPlace,
            photoUrl: dataToSave.step1.photoUrl,
            idProofFileUrl: dataToSave.step1.idProofFileUrl,
            profileData: stepPayload,
          });

          if (!updated) {
            throw new Error('Server returned empty response');
          }
        } else if (
          dataToSave.step1.firstName &&
          dataToSave.step1.lastName &&
          dataToSave.step1.gender &&
          dataToSave.step1.dateOfBirth &&
          dataToSave.step1.mobile &&
          dataToSave.step1.email
        ) {
          // If we have required step1 fields and no existing profile, create remote profile
          const created = await createProfile({
            firstName: dataToSave.step1.firstName,
            lastName: dataToSave.step1.lastName,
            gender: dataToSave.step1.gender,
            dateOfBirth: dataToSave.step1.dateOfBirth,
            mobile: dataToSave.step1.mobile,
            email: dataToSave.step1.email,
            idProofType: dataToSave.step1.idProofType,
            idProofNumber: dataToSave.step1.idProofNumber,
            timeOfBirth: dataToSave.step1.timeOfBirth,
            birthPlace: dataToSave.step1.birthPlace,
            photoUrl: dataToSave.step1.photoUrl,
            idProofFileUrl: dataToSave.step1.idProofFileUrl,
            currentStep: dataToSave.currentStep,
            completedSteps: dataToSave.completedSteps,
            profileData: stepPayload,
          });

          if (created && created.id) {
            setActiveProfileId(created.id);
            setFormData((prev) => {
              const updated = {
                ...prev,
                id: created.id,
                memberId: created.memberId,
                userId: created.userId,
              };
              cacheLocally(updated);
              return updated;
            });
          }
        } else if (isFinalSubmit) {
          throw new Error('Profile record ID not found. Please log in or refresh the page.');
        }

        setSaveStatus({
          status: 'saved',
          lastSavedAt: new Date(),
        });
        setIsDirty(false);
        return true;
      } catch (err: any) {
        console.error('Backend save failed:', err);
        setSaveStatus({
          status: 'error',
          lastSavedAt: null,
          errorMessage: err.message || 'Failed to save to server',
        });
        return false;
      }
    },
    [formData, activeProfileId, cacheLocally],
  );

  // ─── Step Navigation ──────────────────────────────────────────────────────
  const nextStep = useCallback(async (): Promise<boolean> => {
    const current = formData.currentStep;

    // Validate current step
    const currentStepErrors = validateStep(current, formData);
    if (Object.keys(currentStepErrors).length > 0) {
      setErrors(currentStepErrors);
      setValidationAlert(`Please complete all required fields in Step ${current} before proceeding.`);
      return false;
    }

    setErrors({});
    setValidationAlert(null);

    // ─── Final Submission Handling (Step 5) ─────────────────────────────────
    if (current === 5) {
      // Validate ALL 5 steps!
      const fullVal = validateAllSteps(formData);

      // Verify ID Proof document upload
      const hasIdProof = Boolean(formData.step1.idProofFileUrl || formData.step5.idProofUploaded);
      if (!hasIdProof) {
        if (!fullVal.errorsByStep[1]) fullVal.errorsByStep[1] = {};
        fullVal.errorsByStep[1].idProofFileUrl = 'ID proof file upload is required before final submission';
        if (!fullVal.failingSteps.includes(1)) fullVal.failingSteps.unshift(1);
        fullVal.isValid = false;
        fullVal.firstFailingStep = fullVal.failingSteps[0];
      }

      // Verify profile photo upload
      if (!formData.step1.photoUrl || !formData.step1.photoUrl.trim()) {
        if (!fullVal.errorsByStep[1]) fullVal.errorsByStep[1] = {};
        fullVal.errorsByStep[1].photoUrl = 'Profile photo is required before final submission';
        if (!fullVal.failingSteps.includes(1)) fullVal.failingSteps.unshift(1);
        fullVal.isValid = false;
        fullVal.firstFailingStep = fullVal.failingSteps[0];
      }

      if (!fullVal.isValid && fullVal.firstFailingStep) {
        const targetStep = fullVal.firstFailingStep;
        setErrors(fullVal.errorsByStep[targetStep] || {});
        setValidationAlert(
          `Cannot complete application. Step ${targetStep} has missing or incomplete fields. Please complete all fields in: ${fullVal.failingSteps.map((s) => `Step ${s}`).join(', ')}`,
        );
        // Direct user to the earliest incomplete step
        goToStep(targetStep);
        return false;
      }

      // All 5 steps strictly passed! Prepare final submission data
      const updatedFormData: MemberProfileFormData = {
        ...formData,
        currentStep: 5,
        completedSteps: [1, 2, 3, 4, 5],
        step5: {
          ...formData.step5,
          idProofUploaded: true,
          verificationStatus: 'PENDING_VERIFICATION',
          idProofStatus: formData.step5.idProofVerified ? 'VERIFIED' : 'PENDING_REVIEW',
          submittedForVerificationAt: new Date().toISOString(),
        },
      };

      setFormData(updatedFormData);
      cacheLocally(updatedFormData);

      const saveOk = await saveDraft(updatedFormData, true);
      if (!saveOk) {
        setValidationAlert('Failed to submit application to server. Please check your connection and retry.');
        return false;
      }

      // Update localStorage session for memberProfile
      const stored = localStorage.getItem('memberProfile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            'memberProfile',
            JSON.stringify({
              ...parsed,
              currentStep: 5,
              completedSteps: [1, 2, 3, 4, 5],
            }),
          );
        } catch (e) {}
      }

      return true;
    }

    // Moving forward (step 1 -> 4)
    const nextStepNum = (current + 1) as StepNumber;
    const completedSet = new Set(formData.completedSteps);
    completedSet.add(current);

    const updatedFormData: MemberProfileFormData = {
      ...formData,
      currentStep: nextStepNum,
      completedSteps: Array.from(completedSet) as StepNumber[],
    };

    setFormData(updatedFormData);
    cacheLocally(updatedFormData);
    await saveDraft(updatedFormData);

    return true;
  }, [formData, cacheLocally, saveDraft]);

  const prevStep = useCallback(() => {
    if (formData.currentStep <= 1) return;

    setErrors({});
    setValidationAlert(null);
    const prevStepNum = (formData.currentStep - 1) as StepNumber;
    const updatedFormData: MemberProfileFormData = {
      ...formData,
      currentStep: prevStepNum,
    };

    setFormData(updatedFormData);
    cacheLocally(updatedFormData);
  }, [formData, cacheLocally]);

  const goToStep = useCallback(
    async (targetStep: StepNumber): Promise<boolean> => {
      if (targetStep === formData.currentStep) return true;

      setErrors({});
      setValidationAlert(null);

      // Dynamically compute valid steps
      const completedSet = new Set<StepNumber>();
      for (let s = 1; s <= 5; s++) {
        const errs = validateStep(s as StepNumber, formData);
        if (Object.keys(errs).length === 0) {
          completedSet.add(s as StepNumber);
        }
      }

      const updated: MemberProfileFormData = {
        ...formData,
        currentStep: targetStep,
        completedSteps: Array.from(completedSet),
      };

      setFormData(updated);
      cacheLocally(updated);
      saveDraft(updated);
      return true;
    },
    [formData, cacheLocally, saveDraft],
  );

  // ─── Progress Calculation ─────────────────────────────────────────────────
  const progressPercentage = Math.round(
    (formData.completedSteps.length / 5) * 100,
  );

  return {
    formData,
    currentStep: formData.currentStep,
    completedSteps: formData.completedSteps,
    errors,
    validationAlert,
    clearValidationAlert: () => setValidationAlert(null),
    isLoading,
    isDirty,
    saveStatus,
    progressPercentage,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    saveDraft,
  };
}
