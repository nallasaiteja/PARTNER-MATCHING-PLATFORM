import React from 'react';
import { Step4Data, StepValidationErrors } from '../../types/profile';
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
    'Waiting for Divorce',
    'No Divorce',
  ];

  const handleMaritalToggle = (status: string) => {
    const current = data.preferredMaritalStatus || [];
    const exists = current.includes(status);
    const updated = exists
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange('preferredMaritalStatus', updated);
  };

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
                  onChange={() => handleMaritalToggle(opt)}
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
            Age Range Preference (Years) <span className="required-star">*</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="number"
              min={18}
              max={70}
              className="form-input"
              placeholder="Min Age"
              value={data.ageRangeMin}
              onChange={(e) => onChange('ageRangeMin', parseInt(e.target.value, 10) || 18)}
              disabled={readOnly}
            />
            <span style={{ color: '#64748b' }}>to</span>
            <input
              type="number"
              min={18}
              max={70}
              className="form-input"
              placeholder="Max Age"
              value={data.ageRangeMax}
              onChange={(e) => onChange('ageRangeMax', parseInt(e.target.value, 10) || 70)}
              disabled={readOnly}
            />
          </div>
          {errors.ageRange && <span className="form-error-msg">{errors.ageRange}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">Working Location Preference</label>
          <select
            className="form-select"
            value={data.preferredWorkingLocation || 'Any'}
            onChange={(e) => onChange('preferredWorkingLocation', e.target.value)}
            disabled={readOnly}
          >
            <option value="Any">Any Location (India or Abroad)</option>
            <option value="India">Only India</option>
            <option value="Abroad">Only Abroad (NRI)</option>
          </select>
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
        </div>

        <div className="form-field-group">
          <label className="form-label">Preferred Height Range</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Min Height (e.g. 5'0&quot;)"
              value={data.heightRangeMin}
              onChange={(e) => onChange('heightRangeMin', e.target.value)}
              disabled={readOnly}
            />
            <span style={{ color: '#64748b' }}>to</span>
            <input
              type="text"
              className="form-input"
              placeholder="Max Height (e.g. 6'0&quot;)"
              value={data.heightRangeMax}
              onChange={(e) => onChange('heightRangeMax', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
