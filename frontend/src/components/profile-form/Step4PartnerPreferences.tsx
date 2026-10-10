import React, { useEffect, useState } from 'react';
import { Step4Data, StepValidationErrors } from '../../types/profile';
import { COMPLEXION_OPTIONS, HEIGHT_OPTIONS } from '../../constants/lifestyleOptions';
import { CommunityOption, fetchCommunityOptions } from '../../services/communityApi';
import { LocationOption, fetchLocationChildren } from '../../services/locationApi';
import './StepFormStyles.css';

interface Step4Props {
  data: Step4Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
}

export const Step4PartnerPreferences: React.FC<Step4Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
}) => {
  const maritalOptions = [
    'Unmarried',
    'Widower',
    'Divorced',
    'No Divorce',
    'Waiting for Divorce',
  ];
  const familyStatusOptions = ['Rich', 'Middle Class', 'Average'];
  const educationOptions = [
    'B.Tech / B.E.',
    'M.Tech / M.E.',
    'MBA / PGDM',
    'MBBS / MD',
    'MCA / MS',
    'Degree / B.Sc / B.Com',
    'Other',
  ];
  const [castes, setCastes] = useState<CommunityOption[]>([]);
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [casteLoadError, setCasteLoadError] = useState('');
  const [countryLoadError, setCountryLoadError] = useState('');
  const [professionInput, setProfessionInput] = useState('');
  const [cityInput, setCityInput] = useState('');

  useEffect(() => {
    fetchCommunityOptions({ level: 'CASTE' })
      .then(setCastes)
      .catch(() => setCasteLoadError('Unable to load caste options'));
    fetchLocationChildren()
      .then((options) => setCountries(options.filter((option) => option.level === 'COUNTRY')))
      .catch(() => setCountryLoadError('Unable to load country options'));
  }, []);

  const toggleValue = (field: string, values: string[] | undefined, value: string) => {
    const current = values || [];
    onChange(field, current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };

  const addTag = (field: string, values: string[] | undefined, value: string, clear: () => void) => {
    const normalized = value.trim();
    if (!normalized || (values || []).includes(normalized)) return;
    onChange(field, [...(values || []), normalized]);
    clear();
  };

  const heightIndex = (value: string) => {
    const index = HEIGHT_OPTIONS.findIndex((option) => option.value.startsWith(value));
    return index < 0 ? 0 : index;
  };
  const minHeightIndex = heightIndex(data.heightRangeMin);
  const maxHeightIndex = heightIndex(data.heightRangeMax);

  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 4</span>
        <h2 className="step-panel-title">Partner Preferences</h2>
        <p className="step-panel-desc">
          Capture expectations, criteria, and filters for automated partner matching. (Section 3 — Pages 10–11)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">🔍</span>
        <div>
          <strong>Architecture Scope:</strong> Feeds into Section 4 (Matching Engine). Multi-select filters
          and min-max range sliders power the scoring algorithm.
        </div>
      </div>

      <div className="form-field-group" style={{ marginBottom: '20px' }}>
        <label className="form-label">
          Preferred Marital Status <span className="required-star">*</span>
        </label>
        <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {maritalOptions.map((opt) => {
            const isChecked = (data.preferredMaritalStatus || []).includes(opt);
            return (
              <label
                key={opt}
                className="radio-label"
                style={{
                  background: isChecked ? 'rgba(233, 30, 99, 0.08)' : '#f8fafc',
                  border: isChecked ? '1px solid var(--primary-color)' : '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleValue('preferredMaritalStatus', data.preferredMaritalStatus, opt)}
                  disabled={readOnly}
                />
                {opt}
              </label>
            );
          })}
        </div>
        {errors.preferredMaritalStatus && (
          <span className="form-error-msg">{errors.preferredMaritalStatus}</span>
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">
            Preferred Age Range (Years)
          </label>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label className="form-helper-text">Minimum: {data.ageRangeMin}</label>
            <input type="range" min={18} max={70} value={data.ageRangeMin}
              aria-label="Minimum preferred age"
              onChange={(e) => onChange('ageRangeMin', Math.min(Number(e.target.value), data.ageRangeMax))}
              disabled={readOnly} />
            <label className="form-helper-text">Maximum: {data.ageRangeMax}</label>
            <input type="range" min={18} max={70} value={data.ageRangeMax}
              aria-label="Maximum preferred age"
              onChange={(e) => onChange('ageRangeMax', Math.max(Number(e.target.value), data.ageRangeMin))}
              disabled={readOnly} />
          </div>
          {errors.ageRange && <span className="form-error-msg">{errors.ageRange}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">Preferred Height Range</label>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label className="form-helper-text">Minimum: {HEIGHT_OPTIONS[minHeightIndex].value.split(' (')[0]}</label>
            <input type="range" min={0} max={HEIGHT_OPTIONS.length - 1} value={minHeightIndex}
              aria-label="Minimum preferred height"
              onChange={(e) => {
                const index = Math.min(Number(e.target.value), maxHeightIndex);
                onChange('heightRangeMin', HEIGHT_OPTIONS[index].value.split(' (')[0]);
              }} disabled={readOnly} />
            <label className="form-helper-text">Maximum: {HEIGHT_OPTIONS[maxHeightIndex].value.split(' (')[0]}</label>
            <input type="range" min={0} max={HEIGHT_OPTIONS.length - 1} value={maxHeightIndex}
              aria-label="Maximum preferred height"
              onChange={(e) => {
                const index = Math.max(Number(e.target.value), minHeightIndex);
                onChange('heightRangeMax', HEIGHT_OPTIONS[index].value.split(' (')[0]);
              }} disabled={readOnly} />
          </div>
        </div>
      </div>

      <div className="form-field-group">
        <label className="form-label">Preferred Family Status</label>
        <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {familyStatusOptions.map((status) => (
            <label key={status} className="radio-label">
              <input type="checkbox" checked={(data.preferredFamilyStatus || []).includes(status)}
                onChange={() => toggleValue('preferredFamilyStatus', data.preferredFamilyStatus, status)}
                disabled={readOnly} />
              {status}
            </label>
          ))}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Inter-Caste Marriage Willingness</label>
          <div className="radio-group-row">
            <label className="radio-label">
              <input
                type="radio"
                name="interCaste"
                checked={data.interCasteAllowed === true}
                onChange={() => onChange('interCasteAllowed', true)}
                disabled={readOnly}
              />
              Yes, Open to Inter-Caste
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="interCaste"
                checked={data.interCasteAllowed === false}
                onChange={() => onChange('interCasteAllowed', false)}
                disabled={readOnly}
              />
              No, Same Caste Only
            </label>
          </div>
          {data.interCasteAllowed && (
            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Preferred Castes</label>
              {casteLoadError && <span className="form-error-msg">{casteLoadError}</span>}
              <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                {castes.map((caste) => (
                  <label key={caste.id} className="radio-label">
                    <input type="checkbox" checked={(data.preferredCastes || []).includes(caste.id)}
                      onChange={() => toggleValue('preferredCastes', data.preferredCastes, caste.id)}
                      disabled={readOnly} />
                    {caste.name}
                  </label>
                ))}
              </div>
              {errors.preferredCastes && <span className="form-error-msg">{errors.preferredCastes}</span>}
            </div>
          )}
        </div>

        <div className="form-field-group">
          <label className="form-label">Preferred Working Location</label>
          <select className="form-select" value={data.preferredWorkingLocation || ''}
            onChange={(e) => onChange('preferredWorkingLocation', e.target.value || undefined)} disabled={readOnly}>
            <option value="">Select location</option>
            <option value="India">India</option>
            <option value="Abroad">Abroad</option>
          </select>
          {data.preferredWorkingLocation === 'Abroad' && (
            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Preferred Countries</label>
              {countryLoadError && <span className="form-error-msg">{countryLoadError}</span>}
              <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
                {countries.map((country) => (
                  <label key={country.id} className="radio-label">
                    <input type="checkbox" checked={(data.preferredCountriesAbroad || []).includes(country.id)}
                      onChange={() => toggleValue('preferredCountriesAbroad', data.preferredCountriesAbroad, country.id)}
                      disabled={readOnly} />
                    {country.name}
                  </label>
                ))}
              </div>
              {errors.preferredCountriesAbroad && <span className="form-error-msg">{errors.preferredCountriesAbroad}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Preferred Kuja Dosham</label>
          <select className="form-select" value={data.kujaDoshamPreference || ''}
            onChange={(e) => onChange('kujaDoshamPreference', e.target.value || undefined)} disabled={readOnly}>
            <option value="">Select preference</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Any">Any</option>
          </select>
        </div>
        <div className="form-field-group">
          <label className="form-label">Preferred Complexion</label>
          <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {COMPLEXION_OPTIONS.map((option) => (
              <label key={option} className="radio-label">
                <input type="checkbox" checked={(data.preferredComplexion || []).includes(option)}
                  onChange={() => toggleValue('preferredComplexion', data.preferredComplexion, option)}
                  disabled={readOnly} />
                {option}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-grid-2">
        {([
          ['Smoking Preference', 'smokePreference'],
          ['Drinking Preference', 'drinkPreference'],
          ['Passport Holder', 'passportHolderPreference'],
        ] as const).map(([label, field]) => (
          <div className="form-field-group" key={field}>
            <label className="form-label">{label}</label>
            <div className="radio-group-row">
              <label className="radio-label"><input type="radio" name={field} checked={data[field] === true}
                onChange={() => onChange(field, true)} disabled={readOnly} />Yes</label>
              <label className="radio-label"><input type="radio" name={field} checked={data[field] === false}
                onChange={() => onChange(field, false)} disabled={readOnly} />No</label>
            </div>
          </div>
        ))}
        <div className="form-field-group">
          <label className="form-label">Preferred Education</label>
          <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {educationOptions.map((option) => (
              <label key={option} className="radio-label">
                <input type="checkbox" checked={(data.preferredEducation || []).includes(option)}
                  onChange={() => toggleValue('preferredEducation', data.preferredEducation, option)}
                  disabled={readOnly} />
                {option}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Preferred Profession</label>
          <input className="form-input" value={professionInput} placeholder="Enter a profession and press Enter"
            onChange={(e) => setProfessionInput(e.target.value)} disabled={readOnly}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag('preferredProfession', data.preferredProfession, professionInput, () => setProfessionInput(''));
              }
            }} />
          <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {(data.preferredProfession || []).map((profession) => (
              <button key={profession} type="button" className="radio-label" disabled={readOnly}
                onClick={() => onChange('preferredProfession', data.preferredProfession?.filter((item) => item !== profession))}>
                {profession} ×
              </button>
            ))}
          </div>
        </div>
        <div className="form-field-group">
          <label className="form-label">Preferred Work Cities</label>
          <input className="form-input" value={cityInput} placeholder="Enter a city and press Enter"
            onChange={(e) => setCityInput(e.target.value)} disabled={readOnly}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag('preferredCitiesOfWork', data.preferredCitiesOfWork, cityInput, () => setCityInput(''));
              }
            }} />
          <div className="radio-group-row" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {(data.preferredCitiesOfWork || []).map((city) => (
              <button key={city} type="button" className="radio-label" disabled={readOnly}
                onClick={() => onChange('preferredCitiesOfWork', data.preferredCitiesOfWork?.filter((item) => item !== city))}>
                {city} ×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-field-group">
        <label className="form-label">Payment Interest Date</label>
        <input type="date" className="form-input" value={data.paymentInterestDate || ''}
          onChange={(e) => onChange('paymentInterestDate', e.target.value)} disabled={readOnly} />
        {data.paymentInterestDateSetBy && (
          <span className="form-helper-text">
            Set by {data.paymentInterestDateSetBy === 'MEMBER' ? 'member' : `staff${data.paymentInterestDateSetByStaffId ? ` (${data.paymentInterestDateSetByStaffId})` : ''}`}
          </span>
        )}
      </div>
    </div>
  );
};
