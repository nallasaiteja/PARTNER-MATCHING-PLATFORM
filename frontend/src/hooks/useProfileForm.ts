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
import { validateStep } from '../utils/stepValidation';
import {
  createProfile,
  updateProfile,
  fetchProfileById,
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>({
    status: 'idle',
    lastSavedAt: null,
  });

  const storageKey = `pmp_member_draft_${profileId || 'new'}`;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load initial data (Remote Backend or Local Draft) ───────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);

      // Check for local storage draft first
      const localDraft = localStorage.getItem(storageKey);
      let parsedLocal: MemberProfileFormData | null = null;
      if (localDraft) {
        try {
          const localData = JSON.parse(localDraft);
          const legacyPaymentInterestDate = localData?.step4?.paymentInterestDate
            ?? localData?.step5?.paymentInterestDate;
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

      if (profileId) {
        // Fetch from backend
        try {
          const remote = await fetchProfileById(profileId);
          if (isMounted) {
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
                mobile: remote.user?.mobile || '',
                email: remote.user?.email || '',
                dateOfBirth: remote.dateOfBirth ? remote.dateOfBirth.split('T')[0] : '',
                idProofType: remote.idProofType || '',
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
                paymentInterestDate: parsedLocal?.step4?.paymentInterestDate
                  ?? parsedLocal?.step5?.paymentInterestDate
                  ?? remoteStepData.step4?.paymentInterestDate
                  ?? remoteStepData.step5?.paymentInterestDate,
              },
              step5: {
                ...DEFAULT_STEP_5,
                ...(remoteStepData.step5 || {}),
                ...(parsedLocal?.step5 || {}),
                mobileVerified: remote.user?.mobileVerified ?? remoteStepData.step5?.mobileVerified ?? false,
                emailVerified: remote.user?.emailVerified ?? remoteStepData.step5?.emailVerified ?? false,
                idProofUploaded: Boolean(remote.idProofFileUrl),
              },
            };

            setFormData(merged);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Could not load profile from backend, falling back to local draft:', err);
        }
      }

      // If no profileId or backend failed, use local draft if present
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
  }, [profileId, storageKey]);

  // ─── Auto-cache to localStorage on change ─────────────────────────────────
  const cacheLocally = useCallback(
    (data: MemberProfileFormData) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {
        console.error('Failed to cache draft locally:', e);
      }
    },
    [storageKey],
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

      // Clear field error
      setErrors((prev) => {
        if (!prev[fieldName]) return prev;
        const copy = { ...prev };
        delete copy[fieldName];
        return copy;
      });
    },
    [cacheLocally],
  );

  // ─── Save Draft to Backend ────────────────────────────────────────────────
  const saveDraft = useCallback(
    async (overrideData?: MemberProfileFormData): Promise<boolean> => {
      const dataToSave = overrideData || formData;
      setSaveStatus((prev) => ({ ...prev, status: 'saving' }));

      try {
        // Prepare payload for backend
        const stepPayload = {
          step1: dataToSave.step1,
          step2: dataToSave.step2,
          step3: dataToSave.step3,
          step4: dataToSave.step4,
          step5: dataToSave.step5,
        };

        if (dataToSave.id) {
          // Update existing
          await updateProfile(dataToSave.id, {
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
        } else if (
          dataToSave.step1.firstName &&
          dataToSave.step1.lastName &&
          dataToSave.step1.gender &&
          dataToSave.step1.dateOfBirth &&
          dataToSave.step1.mobile &&
          dataToSave.step1.email
        ) {
          // If we have the required Step 1 fields for creation, create remote profile
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
        }

        setSaveStatus({
          status: 'saved',
          lastSavedAt: new Date(),
        });
        setIsDirty(false);
        return true;
      } catch (err: any) {
        console.warn('Backend save deferred/failed; local draft remains safe:', err.message);
        // Local persistence still succeeded
        setSaveStatus({
          status: 'saved',
          lastSavedAt: new Date(),
          errorMessage: 'Saved locally (draft cached)',
        });
        return true;
      }
    },
    [formData, cacheLocally],
  );

  // ─── Step Navigation ──────────────────────────────────────────────────────

  const nextStep = useCallback(async (): Promise<boolean> => {
    const current = formData.currentStep;
    const stepErrors = validateStep(current, formData);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return false;
    }

    setErrors({});

    const nextStepNum = (current + 1) as StepNumber;
    const completedSet = new Set(formData.completedSteps);
    completedSet.add(current);

    const updatedFormData: MemberProfileFormData = {
      ...formData,
      currentStep: current < 5 ? nextStepNum : current,
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

      // Moving backwards is always allowed and preserves entered data
      if (targetStep < formData.currentStep) {
        setErrors({});
        const updated = { ...formData, currentStep: targetStep };
        setFormData(updated);
        cacheLocally(updated);
        return true;
      }

      // Allow direct navigation between steps; validation remains enforced on the Next action.
      setErrors({});
      const completedSet = new Set(formData.completedSteps);
      completedSet.add(formData.currentStep);

      const updated: MemberProfileFormData = {
        ...formData,
        currentStep: targetStep,
        completedSteps: Array.from(completedSet) as StepNumber[],
      };

      setFormData(updated);
      cacheLocally(updated);
      await saveDraft(updated);
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
