import React from 'react';
import { Step2Data, StepValidationErrors } from '../../types/profile';
import './StepFormStyles.css';

interface Step2Props {
  data: Step2Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
}

export const Step2EducationProfessional: React.FC<Step2Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
}) => {
  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 2</span>
        <h2 className="step-panel-title">Education & Professional Details</h2>
        <p className="step-panel-desc">
          Capture educational background, employment status, designation, and income details. (Section 3 — Page 9)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">🎓</span>
        <div>
          <strong>Architecture Scope:</strong> Dropdowns for Education and Profession will link to
          Admin-configurable settings. Conditionals handle Student, India-based, and Abroad employment modes.
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">
            Highest Education <span className="required-star">*</span>
          </label>
          <select
            className={`form-select ${errors.education ? 'has-error' : ''}`}
            value={data.education}
            onChange={(e) => onChange('education', e.target.value)}
            disabled={readOnly}
          >
            <option value="">Select Education</option>
            <option value="B.Tech / B.E.">B.Tech / B.E.</option>
            <option value="M.Tech / M.E.">M.Tech / M.E.</option>
            <option value="MBA / PGDM">MBA / PGDM</option>
            <option value="MBBS / MD">MBBS / MD</option>
            <option value="MCA / MS">MCA / MS</option>
            <option value="Degree / B.Sc / B.Com">Degree / B.Sc / B.Com</option>
            <option value="Other">Other</option>
          </select>
          {errors.education && <span className="form-error-msg">{errors.education}</span>}
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Employed In <span className="required-star">*</span>
          </label>
          <select
            className={`form-select ${errors.employedIn ? 'has-error' : ''}`}
            value={data.employedIn}
            onChange={(e) => onChange('employedIn', e.target.value)}
            disabled={readOnly}
          >
            <option value="">Select Employment Sector</option>
            <option value="Private">Private Sector</option>
            <option value="Government">Government / Public Sector</option>
            <option value="Business">Business / Self-Employed</option>
            <option value="Student">Student</option>
            <option value="Unemployed">Not Employed</option>
          </select>
          {errors.employedIn && <span className="form-error-msg">{errors.employedIn}</span>}
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-field-group">
          <label className="form-label">Profession</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Software Engineer"
            value={data.profession || ''}
            onChange={(e) => onChange('profession', e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-group">
          <label className="form-label">Designation</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Senior Tech Lead"
            value={data.designation || ''}
            onChange={(e) => onChange('designation', e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="form-field-group">
          <label className="form-label">Working Location</label>
          <select
            className="form-select"
            value={data.workingLocation || 'India'}
            onChange={(e) => onChange('workingLocation', e.target.value as any)}
            disabled={readOnly}
          >
            <option value="India">Working in India</option>
            <option value="Abroad">Working Abroad (NRI)</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Annual Income</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. ₹ 15,00,000 / $ 120,000"
            value={data.annualIncome || ''}
            onChange={(e) => onChange('annualIncome', e.target.value)}
            disabled={readOnly}
          />
          <span className="form-helper-text">Accepts any currency (INR, USD, EUR, etc.)</span>
        </div>

        <div className="form-field-group">
          <label className="form-label">Company Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Infosys, TCS, Google"
            value={data.companyName || ''}
            onChange={(e) => onChange('companyName', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="form-field-group">
        <label className="form-label">Property / Asset Details</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Brief description of house, land, commercial properties, etc."
          value={data.propertyDetails || ''}
          onChange={(e) => onChange('propertyDetails', e.target.value)}
          disabled={readOnly}
        />
      </div>
    </div>
  );
};
