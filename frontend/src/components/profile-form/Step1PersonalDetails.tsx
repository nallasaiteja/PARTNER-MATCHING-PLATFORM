import React, { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Step1Data, StepValidationErrors } from '../../types/profile';
import { fetchLocationChildren, LocationOption } from '../../services/locationApi';
import { CommunityLevel, CommunityOption, fetchCommunityOptions } from '../../services/communityApi';
import { casteChangeFields, hiddenCommunityFields, isAryaVysyaCaste, isHinduReligion, religionChangeFields } from '../../utils/communityFields';
import {
  HEIGHT_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
  COMPLEXION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  FOOD_PREFERENCE_OPTIONS,
  HOBBY_SUGGESTIONS,
  SPOKEN_LANGUAGE_OPTIONS,
  APPLICATION_FOR_OPTIONS,
  BEST_TIME_TO_CALL_OPTIONS,
  SOURCE_OPTIONS,
  CHILD_MARITAL_STATUS_OPTIONS,
} from '../../constants/lifestyleOptions';
import './StepFormStyles.css';

interface Step1Props {
  data: Step1Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
  immutableFields?: string[];
}

const PHOTO_MIN_SIZE = 300;
const PHOTO_MAX_SIZE = 500 * 1024;

function useLocationOptions(parentId: string | null | undefined = null) {
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    setOptions([]);
    setError('');
    if (parentId === undefined) return () => { isCurrent = false; };

    fetchLocationChildren(parentId || undefined)
      .then((items) => {
        if (isCurrent) setOptions(items);
      })
      .catch((loadError: Error) => {
        if (isCurrent) setError(loadError.message);
      });

    return () => { isCurrent = false; };
  }, [parentId]);

  return { options, error };
}

function useCommunityOptions(level: CommunityLevel, parentId?: string) {
  const [options, setOptions] = useState<CommunityOption[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    setOptions([]);
    setError('');
    fetchCommunityOptions({ level, parentId })
      .then((items) => {
        if (isCurrent) setOptions(items);
      })
      .catch((loadError: Error) => {
        if (isCurrent) setError(loadError.message);
      });
    return () => { isCurrent = false; };
  }, [level, parentId]);

  return { options, error };
}

function getCroppedImageUrl(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number }) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas is not supported in this browser'));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Unable to generate cropped photo'));
          return;
        }
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, 'image/jpeg', 0.92);
    };
    image.onerror = () => reject(new Error('Unable to read selected photo'));
  });
}

export const Step1PersonalDetails: React.FC<Step1Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
  immutableFields = [],
}) => {
  const isImmutable = (field: string) => immutableFields.includes(field);
  const [photoSource, setPhotoSource] = useState<string | null>(data.photoUrl || null);
  const [photoError, setPhotoError] = useState('');
  const [idProofError, setIdProofError] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const countries = useLocationOptions();
  const states = useLocationOptions(data.countryId || undefined);
  const districts = useLocationOptions(data.stateId || undefined);
  const mandals = useLocationOptions(data.districtId || undefined);
  const villages = useLocationOptions(data.mandalId || undefined);
  const religions = useCommunityOptions('RELIGION');
  const castes = useCommunityOptions('CASTE', data.religionId);
  const subCastes = useCommunityOptions('SUB_CASTE', data.casteId);
  const stars = useCommunityOptions('STAR');
  const moonSigns = useCommunityOptions('MOON_SIGN');
  const padams = useCommunityOptions('PADAM');
  const gothrams = useCommunityOptions('GOTHRAM');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const idProofInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPhotoSource(data.photoUrl || null);
  }, [data.photoUrl]);

  useEffect(() => {
    const match = countries.options.find((item) => item.name.toLowerCase() === data.country?.toLowerCase());
    if (!data.countryId && match) onChange('countryId', match.id);
  }, [countries.options, data.country, data.countryId, onChange]);

  useEffect(() => {
    const match = states.options.find((item) => item.name.toLowerCase() === data.state?.toLowerCase());
    if (!data.stateId && match) onChange('stateId', match.id);
  }, [states.options, data.state, data.stateId, onChange]);

  useEffect(() => {
    const match = districts.options.find((item) => item.name.toLowerCase() === data.district?.toLowerCase());
    if (!data.districtId && match) onChange('districtId', match.id);
  }, [districts.options, data.district, data.districtId, onChange]);

  useEffect(() => {
    const match = mandals.options.find((item) => item.name.toLowerCase() === data.mandal?.toLowerCase());
    if (!data.mandalId && match) onChange('mandalId', match.id);
  }, [mandals.options, data.mandal, data.mandalId, onChange]);

  useEffect(() => {
    const match = villages.options.find((item) => item.name.toLowerCase() === data.village?.toLowerCase());
    if (!data.villageId && match) onChange('villageId', match.id);
  }, [villages.options, data.village, data.villageId, onChange]);

  useEffect(() => {
    const match = religions.options.find((item) => item.name.toLowerCase() === data.religion?.toLowerCase());
    if (!data.religionId && match) onChange('religionId', match.id);
  }, [religions.options, data.religion, data.religionId, onChange]);

  useEffect(() => {
    const match = castes.options.find((item) => item.name.toLowerCase() === data.caste?.toLowerCase());
    if (!data.casteId && match) onChange('casteId', match.id);
  }, [castes.options, data.caste, data.casteId, onChange]);

  useEffect(() => {
    const match = subCastes.options.find((item) => item.name.toLowerCase() === data.subCaste?.toLowerCase());
    if (!data.subCasteId && match) onChange('subCasteId', match.id);
  }, [subCastes.options, data.subCaste, data.subCasteId, onChange]);

  useEffect(() => {
    hiddenCommunityFields(data.religion, data.caste).forEach((field) => {
      if (data[field]) onChange(field, '');
    });
  }, [data.religion, data.caste, data.star, data.starId, data.moonSign, data.moonSignId, data.padam, data.padamId, data.gothram, data.gothramId, data.kujaDosham, data.uncleGothram, data.swagothram, onChange]);

  useEffect(() => {
    if (!isAryaVysyaCaste(data.religion, data.caste)) {
      casteChangeFields().filter((field) => field === 'uncleGothram' || field === 'swagothram')
        .forEach((field) => { if (data[field]) onChange(field, ''); });
    }
  }, [data.caste, data.uncleGothram, data.swagothram, onChange]);

  const clearAddressFields = (fields: string[]) => {
    fields.forEach((field) => onChange(field, ''));
  };

  const selectAddressOption = (field: string, option?: LocationOption) => {
    onChange(field, option?.name || '');
    onChange(`${field}Id`, option?.id || '');
    const descendants: Record<string, string[]> = {
      country: ['state', 'district', 'mandal', 'village'],
      state: ['district', 'mandal', 'village'],
      district: ['mandal', 'village'],
      mandal: ['village'],
    };
    clearAddressFields((descendants[field] || []).flatMap((child) => [child, `${child}Id`]));
  };

  const selectReligion = (option?: CommunityOption) => {
    onChange('religion', option?.name || '');
    onChange('religionId', option?.id || '');
    religionChangeFields().forEach((field) => onChange(field, ''));
  };

  const selectCaste = (option?: CommunityOption) => {
    onChange('caste', option?.name || '');
    onChange('casteId', option?.id || '');
    casteChangeFields().forEach((field) => onChange(field, ''));
  };

  const selectCommunityField = (field: string, option?: CommunityOption) => {
    onChange(field, option?.name || '');
    onChange(`${field}Id`, option?.id || '');
  };

  const isHindu = isHinduReligion(data.religion);
  const isAryaVysya = isAryaVysyaCaste(data.religion, data.caste);

  const isMaritalHistoryApplicable = Boolean(
    data.maritalStatus && data.maritalStatus !== 'Unmarried',
  );

  const currentHeightOption = HEIGHT_OPTIONS.find((h) => h.value === data.height) ||
    HEIGHT_OPTIONS.find((h) => data.height && h.value.includes(data.height));
  const currentHeightCm = currentHeightOption ? currentHeightOption.cm : 165;

  const handleHeightSliderChange = (cmVal: number) => {
    let closest = HEIGHT_OPTIONS[0];
    let minDiff = Math.abs(closest.cm - cmVal);
    for (const opt of HEIGHT_OPTIONS) {
      const diff = Math.abs(opt.cm - cmVal);
      if (diff < minDiff) {
        minDiff = diff;
        closest = opt;
      }
    }
    onChange('height', closest.value);
  };

  const selectedHobbiesList = (data.hobbies || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  const toggleHobby = (hobby: string) => {
    let updated: string[];
    if (selectedHobbiesList.includes(hobby)) {
      updated = selectedHobbiesList.filter((h) => h !== hobby);
    } else {
      updated = [...selectedHobbiesList, hobby];
    }
    onChange('hobbies', updated.join(', '));
  };

  const toggleLanguage = (lang: string) => {
    const currentLanguages = Array.isArray(data.spokenLanguages)
      ? [...data.spokenLanguages]
      : [];
    let updated: string[];
    if (currentLanguages.includes(lang)) {
      updated = currentLanguages.filter((l) => l !== lang);
    } else {
      updated = [...currentLanguages, lang];
    }
    onChange('spokenLanguages', updated);
  };

  const handleMaritalStatusChange = (status: string) => {
    onChange('maritalStatus', status);
    if (status === 'Unmarried') {
      onChange('dateOfMarriage', '');
      onChange('dateOfDivorce', '');
      onChange('divorceReason', '');
      onChange('divorceCertificateUrl', '');
      onChange('dateOfSpouseDeath', '');
      onChange('deathCertificateUrl', '');
      onChange('havingChildren', false);
      onChange('sons', []);
      onChange('daughters', []);
    }
  };

  const addSon = () => {
    const sons = Array.isArray(data.sons) ? [...data.sons] : [];
    onChange('sons', [...sons, { name: '', age: 0, maritalStatus: 'Unmarried' }]);
  };
  const removeSon = (index: number) => {
    const sons = (data.sons || []).filter((_, i) => i !== index);
    onChange('sons', sons);
  };
  const updateSon = (index: number, field: string, value: any) => {
    const sons = (data.sons || []).map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange('sons', sons);
  };

  const addDaughter = () => {
    const daughters = Array.isArray(data.daughters) ? [...data.daughters] : [];
    onChange('daughters', [...daughters, { name: '', age: 0, maritalStatus: 'Unmarried' }]);
  };
  const removeDaughter = (index: number) => {
    const daughters = (data.daughters || []).filter((_, i) => i !== index);
    onChange('daughters', daughters);
  };
  const updateDaughter = (index: number, field: string, value: any) => {
    const daughters = (data.daughters || []).map((d, i) => (i === index ? { ...d, [field]: value } : d));
    onChange('daughters', daughters);
  };

  const copyNativeToCurrentAddress = () => {
    onChange('currentCountry', data.country || '');
    onChange('currentState', data.state || '');
    onChange('currentDistrict', data.district || '');
    onChange('currentCity', data.district || '');
    onChange('currentVillage', data.village || '');
  };

  const handleCertificateUpload = (file: File | null, field: 'divorceCertificateUrl' | 'deathCertificateUrl') => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onChange(field, objectUrl);
  };

  const handleImageFile = (file: File | null, type: 'photo' | 'idProof') => {
    if (!file) return;

    if (type === 'photo') {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Please select a valid image for the profile photo');
        return;
      }
      if (file.size > PHOTO_MAX_SIZE) {
        setPhotoError('Photo must be 500KB or smaller. Please upload a smaller image.');
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.width < PHOTO_MIN_SIZE || img.height < PHOTO_MIN_SIZE) {
          setPhotoError(`Photo must be at least ${PHOTO_MIN_SIZE}x${PHOTO_MIN_SIZE} pixels.`);
          return;
        }
        setPhotoError('');
        setPhotoSource(imageUrl);
        setCropOpen(true);
      };
      img.src = imageUrl;
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setIdProofError('Only JPG, PNG, WEBP or PDF files are allowed for ID proof.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setIdProofError('ID proof file must be smaller than 5MB.');
      return;
    }

    setIdProofError('');
    const objectUrl = URL.createObjectURL(file);
    onChange('idProofFileUrl', objectUrl);
    onChange('idProofType', data.idProofType || 'Aadhar Card');
  };

  const finalizeCrop = async () => {
    if (!photoSource || !croppedAreaPixels) return;
    try {
      const croppedUrl = await getCroppedImageUrl(photoSource, croppedAreaPixels);
      onChange('photoUrl', croppedUrl);
      setCropOpen(false);
      setPhotoError('');
    } catch (error: any) {
      setPhotoError(error.message || 'Unable to crop the selected photo');
    }
  };

  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 1</span>
        <h2 className="step-panel-title">Photo Upload & Core Identity</h2>
        <p className="step-panel-desc">
          Capture the required profile photo and core identity details for the member record.
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">📋</span>
        <div>
          <strong>Step 1:</strong> Photo, core identity, address, and religion/community details are captured here. Physical/lifestyle, marital history, and contact/application meta remain out of scope.
        </div>
      </div>

      <div className="step-upload-grid">
        <div className="upload-panel">
          <label className="form-label">Profile Photo <span className="required-star">*</span></label>
          <div className="photo-upload-box">
            {photoSource ? (
              <img src={photoSource} alt="Profile preview" className="photo-preview" />
            ) : (
              <div className="upload-placeholder">Upload photo</div>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => handleImageFile(e.target.files?.[0] || null, 'photo')}
          />
          <div className="upload-actions-row">
            <button type="button" className="btn-upload" onClick={() => photoInputRef.current?.click()}>
              Upload from Device / Drive / Camera
            </button>
          </div>
          {errors.photoUrl && <span className="form-error-msg">{errors.photoUrl}</span>}
          {photoError && <span className="form-error-msg">{photoError}</span>}
          <small className="form-helper-text">Minimum resolution: 300×300, max file size: 500KB</small>
        </div>

        <div className="upload-panel">
          <label className="form-label">ID Proof File <span className="required-star">*</span></label>
          <div className="file-upload-box">
            {data.idProofFileUrl ? (
              <span className="upload-file-name">Document attached</span>
            ) : (
              <span className="upload-placeholder">No file attached</span>
            )}
          </div>
          <input
            ref={idProofInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hidden
            onChange={(e) => handleImageFile(e.target.files?.[0] || null, 'idProof')}
          />
          <div className="upload-actions-row">
            <button type="button" className="btn-upload" onClick={() => idProofInputRef.current?.click()}>
              Upload ID Proof
            </button>
          </div>
          {errors.idProofFileUrl && <span className="form-error-msg">{errors.idProofFileUrl}</span>}
          {idProofError && <span className="form-error-msg">{idProofError}</span>}
          <small className="form-helper-text">Accepted: JPG, PNG, WEBP, PDF</small>
        </div>
      </div>

      {cropOpen && photoSource && (
        <div className="crop-modal">
          <div className="crop-wrapper">
            <Cropper
              image={photoSource}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
            />
          </div>
          <div className="crop-actions">
            <label className="slider-label">Zoom</label>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <button type="button" className="btn-nav btn-nav-next" onClick={finalizeCrop}>Apply crop</button>
            <button type="button" className="btn-nav btn-nav-prev" onClick={() => setCropOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">
            Full Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.firstName ? 'has-error' : ''}`}
            placeholder="e.g. Ramesh"
            value={data.firstName}
            onChange={(e) => onChange('firstName', e.target.value)}
            disabled={readOnly || isImmutable('firstName')}
          />
          {errors.firstName && <span className="form-error-msg">{errors.firstName}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Surname <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.lastName ? 'has-error' : ''}`}
            placeholder="e.g. Kolisetty"
            value={data.lastName}
            onChange={(e) => onChange('lastName', e.target.value)}
            disabled={readOnly || isImmutable('lastName')}
          />
          {errors.lastName && <span className="form-error-msg">{errors.lastName}</span>}
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-field-group">
          <label className="form-label">
            Gender <span className="required-star">*</span>
          </label>
          <select
            className={`form-select ${errors.gender ? 'has-error' : ''}`}
            value={data.gender}
            onChange={(e) => onChange('gender', e.target.value)}
            disabled={readOnly || isImmutable('mobile')}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && <span className="form-error-msg">{errors.gender}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Mobile Number <span className="required-star">*</span>
          </label>
          <input
            type="tel"
            className={`form-input ${errors.mobile ? 'has-error' : ''}`}
            placeholder="e.g. 9876543210"
            value={data.mobile}
            onChange={(e) => onChange('mobile', e.target.value)}
            disabled={readOnly || isImmutable('email')}
          />
          {errors.mobile && <span className="form-error-msg">{errors.mobile}</span>}
          <span className="form-helper-text">Primary registration number</span>
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Email <span className="required-star">*</span>
          </label>
          <input
            type="email"
            className={`form-input ${errors.email ? 'has-error' : ''}`}
            placeholder="e.g. ramesh@example.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            disabled={readOnly || isImmutable('dateOfBirth')}
          />
          {errors.email && <span className="form-error-msg">{errors.email}</span>}
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-field-group">
          <label className="form-label">
            ID Proof Type <span className="required-star">*</span>
          </label>
          <select
            className={`form-select ${errors.idProofType ? 'has-error' : ''}`}
            value={data.idProofType || ''}
            onChange={(e) => onChange('idProofType', e.target.value)}
            disabled={readOnly}
          >
            <option value="">Select ID Proof Type</option>
            <option value="Aadhar Card">Aadhar Card</option>
            <option value="Passport">Passport</option>
            <option value="Voter ID">Voter ID</option>
            <option value="PAN Card">PAN Card</option>
          </select>
          {errors.idProofType && <span className="form-error-msg">{errors.idProofType}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">
            ID Proof Number <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.idProofNumber ? 'has-error' : ''}`}
            placeholder="e.g. 1234 5678 9012"
            value={data.idProofNumber || ''}
            onChange={(e) => onChange('idProofNumber', e.target.value)}
            disabled={readOnly}
          />
          {errors.idProofNumber && <span className="form-error-msg">{errors.idProofNumber}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Date of Birth <span className="required-star">*</span>
          </label>
          <input
            type="date"
            className={`form-input ${errors.dateOfBirth ? 'has-error' : ''}`}
            value={data.dateOfBirth}
            onChange={(e) => onChange('dateOfBirth', e.target.value)}
            disabled={readOnly}
          />
          {errors.dateOfBirth && <span className="form-error-msg">{errors.dateOfBirth}</span>}
          <span className="form-helper-text">Age must be 18–70 years</span>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Time of Birth</label>
          <input
            type="time"
            className={`form-input ${errors.timeOfBirth ? 'has-error' : ''}`}
            value={data.timeOfBirth || ''}
            onChange={(e) => onChange('timeOfBirth', e.target.value)}
            disabled={readOnly}
          />
          {errors.timeOfBirth && <span className="form-error-msg">{errors.timeOfBirth}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">Birth Place</label>
          <input
            type="text"
            className="form-input"
            placeholder="Optional"
            value={data.birthPlace || ''}
            onChange={(e) => onChange('birthPlace', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <section className="profile-address-section" aria-labelledby="native-address-heading">
        <h3 id="native-address-heading" className="address-section-title">Address</h3>
        {(countries.error || states.error || districts.error || mandals.error || villages.error) && (
          <div className="form-error-msg" role="alert">
            {countries.error || states.error || districts.error || mandals.error || villages.error}
          </div>
        )}
        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-country">Country <span className="required-star">*</span></label>
            <select
              id="profile-country"
              className={`form-select ${errors.country ? 'has-error' : ''}`}
              value={data.countryId || ''}
              onChange={(event) => selectAddressOption('country', countries.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || isImmutable('religion')}
            >
              <option value="">Select country</option>
              {countries.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.country && <span className="form-error-msg">{errors.country}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-state">State <span className="required-star">*</span></label>
            <select
              id="profile-state"
              className={`form-select ${errors.state ? 'has-error' : ''}`}
              value={data.stateId || ''}
              onChange={(event) => selectAddressOption('state', states.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || !data.countryId}
            >
              <option value="">Select state</option>
              {states.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.state && <span className="form-error-msg">{errors.state}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-district">District</label>
            <select
              id="profile-district"
              className={`form-select ${errors.district ? 'has-error' : ''}`}
              value={data.districtId || ''}
              onChange={(event) => selectAddressOption('district', districts.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || !data.stateId}
            >
              <option value="">Select district (optional)</option>
              {districts.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.district && <span className="form-error-msg">{errors.district}</span>}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-mandal">Mandal</label>
            <select
              id="profile-mandal"
              className={`form-select ${errors.mandal ? 'has-error' : ''}`}
              value={data.mandalId || ''}
              onChange={(event) => selectAddressOption('mandal', mandals.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || !data.districtId}
            >
              <option value="">Select mandal (optional)</option>
              {mandals.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.mandal && <span className="form-error-msg">{errors.mandal}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-village-select">Village</label>
            <select
              id="profile-village-select"
              className={`form-select ${errors.village ? 'has-error' : ''}`}
              value={data.villageId || ''}
              onChange={(event) => {
                const option = villages.options.find((item) => item.id === event.target.value);
                onChange('village', option?.name || '');
                onChange('villageId', option?.id || '');
              }}
              disabled={readOnly || !data.mandalId}
            >
              <option value="">Choose a master village (optional)</option>
              {villages.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input
              type="text"
              className={`form-input ${errors.village ? 'has-error' : ''}`}
              placeholder="Or enter village name"
              value={data.village || ''}
              onChange={(event) => {
                onChange('village', event.target.value);
                onChange('villageId', '');
              }}
              disabled={readOnly}
            />
            {errors.village && <span className="form-error-msg">{errors.village}</span>}
          </div>
        </div>
      </section>

      <section className="profile-address-section" aria-labelledby="religion-community-heading">
        <h3 id="religion-community-heading" className="address-section-title">Religion &amp; Community</h3>
        {(religions.error || castes.error || subCastes.error || stars.error || moonSigns.error || padams.error || gothrams.error) && (
          <div className="form-error-msg" role="alert">
            {religions.error || castes.error || subCastes.error || stars.error || moonSigns.error || padams.error || gothrams.error}
          </div>
        )}

        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-religion">Religion <span className="required-star">*</span></label>
            <select
              id="profile-religion"
              className={`form-select ${errors.religion ? 'has-error' : ''}`}
              value={data.religionId || ''}
              onChange={(event) => selectReligion(religions.options.find((item) => item.id === event.target.value))}
              disabled={readOnly}
            >
              <option value="">Select religion</option>
              {religions.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.religion && <span className="form-error-msg">{errors.religion}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-caste">Caste <span className="required-star">*</span></label>
            <select
              id="profile-caste"
              className={`form-select ${errors.caste ? 'has-error' : ''}`}
              value={data.casteId || ''}
              onChange={(event) => selectCaste(castes.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || isImmutable('caste') || !data.religionId}
            >
              <option value="">Select caste</option>
              {castes.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {errors.caste && <span className="form-error-msg">{errors.caste}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-sub-caste">Sub-Caste</label>
            <select
              id="profile-sub-caste"
              className="form-select"
              value={data.subCasteId || ''}
              onChange={(event) => selectCommunityField('subCaste', subCastes.options.find((item) => item.id === event.target.value))}
              disabled={readOnly || !data.casteId}
            >
              <option value="">Select sub-caste (optional)</option>
              {subCastes.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="form-field-group community-radio-group">
          <legend className="form-label">Caste Converted</legend>
          <label><input type="radio" name="casteConverted" checked={data.casteConverted === true} onChange={() => onChange('casteConverted', true)} disabled={readOnly} /> Yes</label>
          <label><input type="radio" name="casteConverted" checked={data.casteConverted === false} onChange={() => onChange('casteConverted', false)} disabled={readOnly} /> No</label>
        </fieldset>

        {isHindu && (
          <div className="hindu-community-fields">
            <div className="form-grid-3">
              <div className="form-field-group">
                <label className="form-label" htmlFor="profile-star">Star</label>
                <select id="profile-star" className="form-select" value={data.starId || ''} onChange={(event) => selectCommunityField('star', stars.options.find((item) => item.id === event.target.value))} disabled={readOnly}>
                  <option value="">Select star</option>
                  {stars.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label" htmlFor="profile-moon-sign">Moon Sign / Raasi</label>
                <select id="profile-moon-sign" className="form-select" value={data.moonSignId || ''} onChange={(event) => selectCommunityField('moonSign', moonSigns.options.find((item) => item.id === event.target.value))} disabled={readOnly}>
                  <option value="">Select moon sign</option>
                  {moonSigns.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label" htmlFor="profile-padam">Padam</label>
                <select id="profile-padam" className="form-select" value={data.padamId || ''} onChange={(event) => selectCommunityField('padam', padams.options.find((item) => item.id === event.target.value))} disabled={readOnly}>
                  <option value="">Select padam</option>
                  {padams.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label" htmlFor="profile-gothram">Gothram</label>
                <select id="profile-gothram" className="form-select" value={data.gothramId || ''} onChange={(event) => selectCommunityField('gothram', gothrams.options.find((item) => item.id === event.target.value))} disabled={readOnly}>
                  <option value="">Select gothram</option>
                  {gothrams.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            </div>

            <fieldset className="form-field-group community-radio-group">
              <legend className="form-label">Kuja Dosham</legend>
              {(['Yes', 'No', "Don't Know"] as const).map((value) => (
                <label key={value}>
                  <input type="radio" name="kujaDosham" value={value} checked={data.kujaDosham === value} onChange={() => onChange('kujaDosham', value)} disabled={readOnly} />
                  {value}
                </label>
              ))}
            </fieldset>

            {isAryaVysya && (
              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label" htmlFor="profile-uncle-gothram">Uncle&apos;s Gothram</label>
                  <input id="profile-uncle-gothram" className="form-input" value={data.uncleGothram || ''} onChange={(event) => onChange('uncleGothram', event.target.value)} disabled={readOnly} />
                </div>
                <div className="form-field-group">
                  <label className="form-label" htmlFor="profile-swagothram">Swagothram</label>
                  <input id="profile-swagothram" className="form-input" value={data.swagothram || ''} onChange={(event) => onChange('swagothram', event.target.value)} disabled={readOnly} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── Physical & Lifestyle Details ─── */}
      <section className="profile-address-section" aria-labelledby="physical-lifestyle-heading">
        <h3 id="physical-lifestyle-heading" className="address-section-title">Physical &amp; Lifestyle Details</h3>

        <div className="form-grid-3">
          {/* 1. Height — Dropdown / Slider — Required */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-height">
              <span>Height <span className="required-star">*</span></span>
              {data.height && (
                <span className="height-display-badge">{data.height}</span>
              )}
            </label>
            <div className="height-control-box">
              <select
                id="profile-height"
                className={`form-select ${errors.height ? 'has-error' : ''}`}
                value={data.height || ''}
                onChange={(e) => onChange('height', e.target.value)}
                disabled={readOnly}
              >
                <option value="">Select Height</option>
                {HEIGHT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="height-slider-row">
                <span className="form-helper-text" style={{ margin: 0 }}>4'5"</span>
                <input
                  type="range"
                  min={134}
                  max={213}
                  step={1}
                  className="height-slider-input"
                  value={currentHeightCm}
                  onChange={(e) => handleHeightSliderChange(Number(e.target.value))}
                  disabled={readOnly}
                  title="Drag slider to adjust height"
                  aria-label="Height Slider"
                />
                <span className="form-helper-text" style={{ margin: 0 }}>7'0"</span>
              </div>
            </div>
            {errors.height && <span className="form-error-msg">{errors.height}</span>}
          </div>

          {/* 2. Blood Group — Dropdown */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-blood-group">Blood Group</label>
            <select
              id="profile-blood-group"
              className={`form-select ${errors.bloodGroup ? 'has-error' : ''}`}
              value={data.bloodGroup || ''}
              onChange={(e) => onChange('bloodGroup', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Blood Group (optional)</option>
              {BLOOD_GROUP_OPTIONS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
            {errors.bloodGroup && <span className="form-error-msg">{errors.bloodGroup}</span>}
          </div>

          {/* 3. Mother Tongue — Dropdown */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-mother-tongue">Mother Tongue</label>
            <select
              id="profile-mother-tongue"
              className={`form-select ${errors.motherTongue ? 'has-error' : ''}`}
              value={data.motherTongue || ''}
              onChange={(e) => onChange('motherTongue', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Mother Tongue</option>
              {MOTHER_TONGUE_OPTIONS.map((mt) => (
                <option key={mt} value={mt}>
                  {mt}
                </option>
              ))}
            </select>
            {errors.motherTongue && <span className="form-error-msg">{errors.motherTongue}</span>}
          </div>
        </div>

        <div className="form-grid-3">
          {/* 4. Health Condition — Text */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-health-condition">Health Condition</label>
            <input
              id="profile-health-condition"
              type="text"
              className="form-input"
              placeholder="e.g. Normal, physically fit, no chronic issues"
              value={data.healthCondition || ''}
              onChange={(e) => onChange('healthCondition', e.target.value)}
              disabled={readOnly}
            />
          </div>

          {/* 5. Complexion — Dropdown */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-complexion">Complexion</label>
            <select
              id="profile-complexion"
              className={`form-select ${errors.complexion ? 'has-error' : ''}`}
              value={data.complexion || ''}
              onChange={(e) => onChange('complexion', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Complexion</option>
              {COMPLEXION_OPTIONS.map((cx) => (
                <option key={cx} value={cx}>
                  {cx}
                </option>
              ))}
            </select>
            {errors.complexion && <span className="form-error-msg">{errors.complexion}</span>}
          </div>

          {/* 6. Marital Status — Dropdown — Required */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-marital-status">
              Marital Status <span className="required-star">*</span>
            </label>
            <select
              id="profile-marital-status"
              className={`form-select ${errors.maritalStatus ? 'has-error' : ''}`}
              value={data.maritalStatus || 'Unmarried'}
              onChange={(e) => handleMaritalStatusChange(e.target.value)}
              disabled={readOnly}
            >
              {MARITAL_STATUS_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms}
                </option>
              ))}
            </select>
            {errors.maritalStatus && <span className="form-error-msg">{errors.maritalStatus}</span>}
          </div>
        </div>

        {/* Conditional Marital History Section Readiness Notice */}
        {isMaritalHistoryApplicable && (
          <div className="conditional-notice-panel" role="status">
            <span className="conditional-notice-icon">ℹ️</span>
            <div>
              <strong>Marital History Applicable: {data.maritalStatus}</strong>
              <p style={{ margin: '4px 0 0 0' }}>
                Marital Status is set to <em>{data.maritalStatus}</em>. The conditional Marital History section (Marriage date, Divorce / Demise records, and Children details) will be enabled for entry next.
              </p>
            </div>
          </div>
        )}

        <div className="form-grid-3" style={{ marginTop: '18px' }}>
          {/* 7. Smoke — Yes/No */}
          <fieldset className="form-field-group">
            <legend className="form-label">Smoke</legend>
            <div className="radio-group-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="smoke"
                  checked={data.smoke === true}
                  onChange={() => onChange('smoke', true)}
                  disabled={readOnly}
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="smoke"
                  checked={data.smoke === false}
                  onChange={() => onChange('smoke', false)}
                  disabled={readOnly}
                />
                No
              </label>
            </div>
          </fieldset>

          {/* 8. Drink — Yes/No */}
          <fieldset className="form-field-group">
            <legend className="form-label">Drink</legend>
            <div className="radio-group-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="drink"
                  checked={data.drink === true}
                  onChange={() => onChange('drink', true)}
                  disabled={readOnly}
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="drink"
                  checked={data.drink === false}
                  onChange={() => onChange('drink', false)}
                  disabled={readOnly}
                />
                No
              </label>
            </div>
          </fieldset>

          {/* 9. Food Preference — Dropdown */}
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-food-preference">Food Preference</label>
            <select
              id="profile-food-preference"
              className={`form-select ${errors.foodPreference ? 'has-error' : ''}`}
              value={data.foodPreference || ''}
              onChange={(e) => onChange('foodPreference', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Food Preference</option>
              {FOOD_PREFERENCE_OPTIONS.map((fp) => (
                <option key={fp} value={fp}>
                  {fp}
                </option>
              ))}
            </select>
            {errors.foodPreference && <span className="form-error-msg">{errors.foodPreference}</span>}
          </div>
        </div>

        {/* 10. About Me — Text Area */}
        <div className="form-field-group" style={{ marginTop: '18px' }}>
          <label className="form-label" htmlFor="profile-about-me">About Me</label>
          <textarea
            id="profile-about-me"
            className="form-textarea"
            rows={4}
            placeholder="Share details about your values, personality, passions, and ideal match..."
            value={data.aboutMe || ''}
            onChange={(e) => onChange('aboutMe', e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* 11. Hobbies — Multi-select / Text */}
        <div className="form-field-group" style={{ marginTop: '18px' }}>
          <label className="form-label" htmlFor="profile-hobbies">
            Hobbies &amp; Interests
          </label>
          <div className="chip-container" aria-label="Suggested hobbies">
            {HOBBY_SUGGESTIONS.map((hobby) => {
              const isSelected = selectedHobbiesList.includes(hobby);
              return (
                <button
                  type="button"
                  key={hobby}
                  className={`selectable-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleHobby(hobby)}
                  disabled={readOnly}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {hobby}
                </button>
              );
            })}
          </div>
          <input
            id="profile-hobbies"
            type="text"
            className="form-input"
            style={{ marginTop: '10px' }}
            placeholder="Click suggestions above or enter comma-separated hobbies"
            value={data.hobbies || ''}
            onChange={(e) => onChange('hobbies', e.target.value)}
            disabled={readOnly}
          />
        </div>

        {/* 12. Spoken Languages — Multi-select */}
        <div className="form-field-group" style={{ marginTop: '18px' }}>
          <label className="form-label">
            Spoken Languages
          </label>
          <div className="chip-container" aria-label="Spoken languages selection">
            {SPOKEN_LANGUAGE_OPTIONS.map((lang) => {
              const isSelected = (data.spokenLanguages || []).includes(lang);
              return (
                <button
                  type="button"
                  key={lang}
                  className={`selectable-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleLanguage(lang)}
                  disabled={readOnly}
                >
                  {isSelected ? '✓ ' : '+ '}
                  {lang}
                </button>
              );
            })}
          </div>
          <span className="form-helper-text">Select all languages you speak fluently</span>
        </div>
      </section>

      {/* ─── Conditional Marital History Section ─── */}
      {isMaritalHistoryApplicable && (
        <section className="profile-address-section" aria-labelledby="marital-history-heading">
          <div className="address-header-row">
            <h3 id="marital-history-heading" className="address-section-title">
              Marital History &amp; Children ({data.maritalStatus})
            </h3>
            <span className="step-badge-pill" style={{ margin: 0 }}>
              Conditional Phase
            </span>
          </div>

          <div className="form-grid-3">
            {/* Date of Marriage */}
            <div className="form-field-group">
              <label className="form-label" htmlFor="profile-date-of-marriage">
                Date of Marriage
              </label>
              <input
                id="profile-date-of-marriage"
                type="date"
                className="form-input"
                value={data.dateOfMarriage || ''}
                onChange={(e) => onChange('dateOfMarriage', e.target.value)}
                disabled={readOnly}
              />
            </div>

            {/* If Divorced or Waiting for Divorce */}
            {(data.maritalStatus === 'Divorced' || data.maritalStatus === 'Waiting for Divorce') && (
              <>
                <div className="form-field-group">
                  <label className="form-label" htmlFor="profile-date-of-divorce">
                    Date of Divorce {data.maritalStatus === 'Waiting for Divorce' && '(Optional)'}
                  </label>
                  <input
                    id="profile-date-of-divorce"
                    type="date"
                    className="form-input"
                    value={data.dateOfDivorce || ''}
                    onChange={(e) => onChange('dateOfDivorce', e.target.value)}
                    disabled={readOnly}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label" htmlFor="profile-divorce-reason">
                    Reason for Divorce
                  </label>
                  <input
                    id="profile-divorce-reason"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mutual consent, irreconcilable differences"
                    value={data.divorceReason || ''}
                    onChange={(e) => onChange('divorceReason', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </>
            )}

            {/* If Widower */}
            {data.maritalStatus === 'Widower' && (
              <div className="form-field-group">
                <label className="form-label" htmlFor="profile-spouse-demise-date">
                  Date of Spouse Demise
                </label>
                <input
                  id="profile-spouse-demise-date"
                  type="date"
                  className="form-input"
                  value={data.dateOfSpouseDeath || ''}
                  onChange={(e) => onChange('dateOfSpouseDeath', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            )}

            {/* If No Divorce */}
            {data.maritalStatus === 'No Divorce' && (
              <div className="form-field-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" htmlFor="profile-separation-notes">
                  Separation Circumstances / Notes
                </label>
                <input
                  id="profile-separation-notes"
                  type="text"
                  className="form-input"
                  placeholder="Details of legal separation or status"
                  value={data.divorceReason || ''}
                  onChange={(e) => onChange('divorceReason', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {/* Certificate Uploads */}
          <div className="form-grid-2" style={{ marginTop: '14px' }}>
            {(data.maritalStatus === 'Divorced' || data.maritalStatus === 'Waiting for Divorce') && (
              <div className="form-field-group">
                <label className="form-label">Divorce Decree / Certificate Document</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleCertificateUpload(e.target.files?.[0] || null, 'divorceCertificateUrl')}
                  disabled={readOnly}
                  style={{ display: 'none' }}
                  id="divorce-cert-input"
                />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label htmlFor="divorce-cert-input" className="btn-upload" style={{ cursor: readOnly ? 'default' : 'pointer' }}>
                    📎 Upload Divorce Certificate
                  </label>
                  {data.divorceCertificateUrl && (
                    <span className="height-display-badge">Document Uploaded ✓</span>
                  )}
                </div>
              </div>
            )}

            {data.maritalStatus === 'Widower' && (
              <div className="form-field-group">
                <label className="form-label">Death Certificate Document</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleCertificateUpload(e.target.files?.[0] || null, 'deathCertificateUrl')}
                  disabled={readOnly}
                  style={{ display: 'none' }}
                  id="death-cert-input"
                />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label htmlFor="death-cert-input" className="btn-upload" style={{ cursor: readOnly ? 'default' : 'pointer' }}>
                    📎 Upload Death Certificate
                  </label>
                  {data.deathCertificateUrl && (
                    <span className="height-display-badge">Document Uploaded ✓</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Children Toggle */}
          <fieldset className="form-field-group" style={{ marginTop: '18px' }}>
            <legend className="form-label">Having Children?</legend>
            <div className="radio-group-row">
              <label className="radio-label">
                <input
                  type="radio"
                  name="havingChildren"
                  checked={data.havingChildren === true}
                  onChange={() => onChange('havingChildren', true)}
                  disabled={readOnly}
                />
                Yes
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="havingChildren"
                  checked={data.havingChildren === false}
                  onChange={() => {
                    onChange('havingChildren', false);
                    onChange('sons', []);
                    onChange('daughters', []);
                  }}
                  disabled={readOnly}
                />
                No
              </label>
            </div>
            {errors.havingChildren && (
              <span className="form-error-msg">{errors.havingChildren}</span>
            )}
          </fieldset>

          {/* Children Details (Sons & Daughters) */}
          {data.havingChildren && (
            <div className="children-container">
              {/* Sons */}
              <div style={{ marginBottom: '20px' }}>
                <div className="children-subheading">
                  <span>Sons ({data.sons?.length || 0})</span>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={addSon}
                    disabled={readOnly}
                  >
                    + Add Son
                  </button>
                </div>

                {(!data.sons || data.sons.length === 0) && (
                  <p className="form-helper-text" style={{ fontStyle: 'italic', margin: '4px 0 12px 0' }}>
                    No sons added yet. Click &quot;+ Add Son&quot; if applicable.
                  </p>
                )}

                {data.sons?.map((son, idx) => (
                  <div key={idx} className="child-card">
                    <div className="child-card-header">
                      <span className="child-card-title">Son #{idx + 1}</span>
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => removeSon(idx)}
                        disabled={readOnly}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-grid-3">
                      <div className="form-field-group">
                        <label className="form-label">
                          Full Name <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-input ${errors[`son_${idx}_name`] ? 'has-error' : ''}`}
                          placeholder="Son's name"
                          value={son.name || ''}
                          onChange={(e) => updateSon(idx, 'name', e.target.value)}
                          disabled={readOnly}
                        />
                        {errors[`son_${idx}_name`] && (
                          <span className="form-error-msg">{errors[`son_${idx}_name`]}</span>
                        )}
                      </div>

                      <div className="form-field-group">
                        <label className="form-label">
                          Age <span className="required-star">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          className={`form-input ${errors[`son_${idx}_age`] ? 'has-error' : ''}`}
                          value={son.age ?? ''}
                          onChange={(e) => updateSon(idx, 'age', Number(e.target.value))}
                          disabled={readOnly}
                        />
                        {errors[`son_${idx}_age`] && (
                          <span className="form-error-msg">{errors[`son_${idx}_age`]}</span>
                        )}
                      </div>

                      {son.age >= 18 && (
                        <div className="form-field-group">
                          <label className="form-label">
                            Marital Status <span className="required-star">*</span>
                          </label>
                          <select
                            className={`form-select ${errors[`son_${idx}_maritalStatus`] ? 'has-error' : ''}`}
                            value={son.maritalStatus || 'Unmarried'}
                            onChange={(e) => updateSon(idx, 'maritalStatus', e.target.value)}
                            disabled={readOnly}
                          >
                            {CHILD_MARITAL_STATUS_OPTIONS.map((ms) => (
                              <option key={ms} value={ms}>
                                {ms}
                              </option>
                            ))}
                          </select>
                          {errors[`son_${idx}_maritalStatus`] && (
                            <span className="form-error-msg">{errors[`son_${idx}_maritalStatus`]}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daughters */}
              <div>
                <div className="children-subheading">
                  <span>Daughters ({data.daughters?.length || 0})</span>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={addDaughter}
                    disabled={readOnly}
                  >
                    + Add Daughter
                  </button>
                </div>

                {(!data.daughters || data.daughters.length === 0) && (
                  <p className="form-helper-text" style={{ fontStyle: 'italic', margin: '4px 0 12px 0' }}>
                    No daughters added yet. Click &quot;+ Add Daughter&quot; if applicable.
                  </p>
                )}

                {data.daughters?.map((daughter, idx) => (
                  <div key={idx} className="child-card">
                    <div className="child-card-header">
                      <span className="child-card-title">Daughter #{idx + 1}</span>
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => removeDaughter(idx)}
                        disabled={readOnly}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-grid-3">
                      <div className="form-field-group">
                        <label className="form-label">
                          Full Name <span className="required-star">*</span>
                        </label>
                        <input
                          type="text"
                          className={`form-input ${errors[`daughter_${idx}_name`] ? 'has-error' : ''}`}
                          placeholder="Daughter's name"
                          value={daughter.name || ''}
                          onChange={(e) => updateDaughter(idx, 'name', e.target.value)}
                          disabled={readOnly}
                        />
                        {errors[`daughter_${idx}_name`] && (
                          <span className="form-error-msg">{errors[`daughter_${idx}_name`]}</span>
                        )}
                      </div>

                      <div className="form-field-group">
                        <label className="form-label">
                          Age <span className="required-star">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          className={`form-input ${errors[`daughter_${idx}_age`] ? 'has-error' : ''}`}
                          value={daughter.age ?? ''}
                          onChange={(e) => updateDaughter(idx, 'age', Number(e.target.value))}
                          disabled={readOnly}
                        />
                        {errors[`daughter_${idx}_age`] && (
                          <span className="form-error-msg">{errors[`daughter_${idx}_age`]}</span>
                        )}
                      </div>

                      {daughter.age >= 18 && (
                        <div className="form-field-group">
                          <label className="form-label">
                            Marital Status <span className="required-star">*</span>
                          </label>
                          <select
                            className={`form-select ${errors[`daughter_${idx}_maritalStatus`] ? 'has-error' : ''}`}
                            value={daughter.maritalStatus || 'Unmarried'}
                            onChange={(e) => updateDaughter(idx, 'maritalStatus', e.target.value)}
                            disabled={readOnly}
                          >
                            {CHILD_MARITAL_STATUS_OPTIONS.map((ms) => (
                              <option key={ms} value={ms}>
                                {ms}
                              </option>
                            ))}
                          </select>
                          {errors[`daughter_${idx}_maritalStatus`] && (
                            <span className="form-error-msg">{errors[`daughter_${idx}_maritalStatus`]}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Current Living Address ─── */}
      <section className="profile-address-section" aria-labelledby="current-address-heading">
        <div className="address-header-row">
          <h3 id="current-address-heading" className="address-section-title">
            Current Living Address
          </h3>
          <button
            type="button"
            className="btn-copy-address"
            onClick={copyNativeToCurrentAddress}
            disabled={readOnly || (!data.country && !data.state)}
            title="Copy native location details into current living address"
          >
            📋 Same as Native Address
          </button>
        </div>

        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-current-country">
              Current Country
            </label>
            <input
              id="profile-current-country"
              type="text"
              className="form-input"
              placeholder="e.g. India, USA, UK"
              value={data.currentCountry || ''}
              onChange={(e) => onChange('currentCountry', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-current-state">
              Current State / Province
            </label>
            <input
              id="profile-current-state"
              type="text"
              className="form-input"
              placeholder="e.g. Telangana, California"
              value={data.currentState || ''}
              onChange={(e) => onChange('currentState', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-current-city">
              Current City / District
            </label>
            <input
              id="profile-current-city"
              type="text"
              className="form-input"
              placeholder="e.g. Hyderabad, Vijayawada"
              value={data.currentCity || ''}
              onChange={(e) => onChange('currentCity', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-current-village">
              Locality / Area / Mandal
            </label>
            <input
              id="profile-current-village"
              type="text"
              className="form-input"
              placeholder="e.g. Madhapur, Jubilee Hills"
              value={data.currentVillage || ''}
              onChange={(e) => onChange('currentVillage', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-current-address">
              Full Street Address / House No.
            </label>
            <input
              id="profile-current-address"
              type="text"
              className="form-input"
              placeholder="Flat / Door no., Apartment / Street name"
              value={data.currentAddress || ''}
              onChange={(e) => onChange('currentAddress', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      </section>

      {/* ─── Contact Preferences & Application Metadata ─── */}
      <section className="profile-address-section" aria-labelledby="contact-metadata-heading">
        <h3 id="contact-metadata-heading" className="address-section-title">
          Contact Preferences &amp; Application Metadata
        </h3>

        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-alt-mobile">
              Alternate Mobile
            </label>
            <input
              id="profile-alt-mobile"
              type="text"
              className={`form-input ${errors.alternateMobile ? 'has-error' : ''}`}
              placeholder="Optional alternate mobile"
              value={data.alternateMobile || ''}
              onChange={(e) => onChange('alternateMobile', e.target.value)}
              disabled={readOnly}
            />
            {errors.alternateMobile && (
              <span className="form-error-msg">{errors.alternateMobile}</span>
            )}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-alt-email">
              Alternate Email
            </label>
            <input
              id="profile-alt-email"
              type="email"
              className={`form-input ${errors.alternateEmail ? 'has-error' : ''}`}
              placeholder="Optional alternate email"
              value={data.alternateEmail || ''}
              onChange={(e) => onChange('alternateEmail', e.target.value)}
              disabled={readOnly}
            />
            {errors.alternateEmail && (
              <span className="form-error-msg">{errors.alternateEmail}</span>
            )}
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-call-time">
              Best Time to Call
            </label>
            <select
              id="profile-call-time"
              className="form-select"
              value={data.bestTimeToCall || 'Anytime'}
              onChange={(e) => onChange('bestTimeToCall', e.target.value)}
              disabled={readOnly}
            >
              {BEST_TIME_TO_CALL_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-3" style={{ marginTop: '14px' }}>
          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-app-for">
              Application Created For <span className="required-star">*</span>
            </label>
            <select
              id="profile-app-for"
              className="form-select"
              value={data.applicationFor || 'Myself'}
              onChange={(e) => onChange('applicationFor', e.target.value)}
              disabled={readOnly}
            >
              {APPLICATION_FOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-source">
              Registration Source
            </label>
            <select
              id="profile-source"
              className="form-select"
              value={data.source || ''}
              onChange={(e) => onChange('source', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Select Source (optional)</option>
              {SOURCE_OPTIONS.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-label" htmlFor="profile-nearest-branch">
              Nearest Branch
            </label>
            <input
              id="profile-nearest-branch"
              type="text"
              className="form-input"
              placeholder="e.g. Hyderabad HQ, Branch A, Vijayawada"
              value={data.nearestBranch || ''}
              onChange={(e) => onChange('nearestBranch', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        {/* If Application is filled by someone else */}
        {data.applicationFor && data.applicationFor !== 'Myself' && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px',
              marginTop: '18px',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 700,
                color: '#1e293b',
              }}
            >
              Form Filler Details (Filling for: {data.applicationFor})
            </h4>
            <div className="form-grid-3">
              <div className="form-field-group">
                <label className="form-label">
                  Filler Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.fillerName ? 'has-error' : ''}`}
                  placeholder="Your full name"
                  value={data.fillerName || ''}
                  onChange={(e) => onChange('fillerName', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fillerName && (
                  <span className="form-error-msg">{errors.fillerName}</span>
                )}
              </div>

              <div className="form-field-group">
                <label className="form-label">
                  Filler Mobile <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.fillerMobile ? 'has-error' : ''}`}
                  placeholder="Your contact mobile"
                  value={data.fillerMobile || ''}
                  onChange={(e) => onChange('fillerMobile', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fillerMobile && (
                  <span className="form-error-msg">{errors.fillerMobile}</span>
                )}
              </div>

              <div className="form-field-group">
                <label className="form-label">Relation to Member</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Father, Mother, Brother"
                  value={data.fillerRelation || ''}
                  onChange={(e) => onChange('fillerRelation', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
