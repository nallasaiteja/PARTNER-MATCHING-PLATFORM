import React from 'react';
import { Step3Data, StepValidationErrors } from '../../types/profile';
import './StepFormStyles.css';

interface Step3Props {
  data: Step3Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
}

export const Step3FamilyDetails: React.FC<Step3Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
}) => {
  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 3</span>
        <h2 className="step-panel-title">Family Details</h2>
        <p className="step-panel-desc">
          Capture parents' background, living status, siblings, and family values. (Section 3 — Page 10)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">👨‍👩‍👧‍👦</span>
        <div>
          <strong>Architecture Scope:</strong> Conditional sections toggle based on Father/Mother Status
          (Late vs Alive). Sibling repeaters track brothers and sisters.
        </div>
      </div>

      {/* Father's Section */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>
        Father's Details
      </h3>
      <div className="form-grid-3">
        <div className="form-field-group">
          <label className="form-label">
            Father's Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.fatherName ? 'has-error' : ''}`}
            placeholder="e.g. Venkata Rao"
            value={data.fatherName}
            onChange={(e) => onChange('fatherName', e.target.value)}
            disabled={readOnly}
          />
          {errors.fatherName && <span className="form-error-msg">{errors.fatherName}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">Father Status</label>
          <select
            className="form-select"
            value={data.fatherStatus}
            onChange={(e) => onChange('fatherStatus', e.target.value)}
            disabled={readOnly}
          >
            <option value="Alive">Alive</option>
            <option value="Late">Late (Deceased)</option>
          </select>
        </div>

        <div className="form-field-group">
          <label className="form-label">Father's Profession</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Retired Govt Officer, Farmer"
            value={data.fatherProfession || ''}
            onChange={(e) => onChange('fatherProfession', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Mother's Section */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginTop: '16px', marginBottom: '14px' }}>
        Mother's Details
      </h3>
      <div className="form-grid-3">
        <div className="form-field-group">
          <label className="form-label">
            Mother's Name <span className="required-star">*</span>
          </label>
          <input
            type="text"
            className={`form-input ${errors.motherName ? 'has-error' : ''}`}
            placeholder="e.g. Lakshmi Devi"
            value={data.motherName}
            onChange={(e) => onChange('motherName', e.target.value)}
            disabled={readOnly}
          />
          {errors.motherName && <span className="form-error-msg">{errors.motherName}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">Mother Status</label>
          <select
            className="form-select"
            value={data.motherStatus}
            onChange={(e) => onChange('motherStatus', e.target.value)}
            disabled={readOnly}
          >
            <option value="Alive">Alive</option>
            <option value="Late">Late (Deceased)</option>
          </select>
        </div>

        <div className="form-field-group">
          <label className="form-label">Mother's Profession</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Homemaker / Teacher"
            value={data.motherProfession || ''}
            onChange={(e) => onChange('motherProfession', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Siblings & Family Type */}
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginTop: '16px', marginBottom: '14px' }}>
        Family Structure & Siblings
      </h3>
      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Number of Brothers</label>
          <input
            type="number"
            min={0}
            max={10}
            className="form-input"
            value={data.numberOfBrothers}
            onChange={(e) => onChange('numberOfBrothers', parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-group">
          <label className="form-label">Number of Sisters</label>
          <input
            type="number"
            min={0}
            max={10}
            className="form-input"
            value={data.numberOfSisters}
            onChange={(e) => onChange('numberOfSisters', parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Family Type</label>
          <select
            className="form-select"
            value={data.familyType}
            onChange={(e) => onChange('familyType', e.target.value)}
            disabled={readOnly}
          >
            <option value="Nuclear Family">Nuclear Family</option>
            <option value="Joint Family">Joint Family</option>
          </select>
        </div>

        <div className="form-field-group">
          <label className="form-label">Family Status</label>
          <select
            className="form-select"
            value={data.familyStatus}
            onChange={(e) => onChange('familyStatus', e.target.value)}
            disabled={readOnly}
          >
            <option value="Rich">Rich</option>
            <option value="Middle Class">Middle Class</option>
            <option value="Average">Average</option>
          </select>
        </div>
      </div>
    </div>
  );
};
