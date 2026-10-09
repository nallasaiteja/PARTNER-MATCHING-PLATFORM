import React from 'react';
import { Step1Data, StepValidationErrors } from '../../types/profile';
import './StepFormStyles.css';

interface Step1Props {
  data: Step1Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
}

export const Step1PersonalDetails: React.FC<Step1Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
}) => {
  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 1</span>
        <h2 className="step-panel-title">Personal Details</h2>
        <p className="step-panel-desc">
          Capture core identity, photo, address, and personal background. (Section 3 — Pages 6–8)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">📋</span>
        <div>
          <strong>Architecture Scope:</strong> Core identity fields are required to establish the profile
          record. Photo crop, religion conditional sections, and ID proof upload integrate here.
        </div>
      </div>

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
            disabled={readOnly}
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
            disabled={readOnly}
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
            disabled={readOnly}
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
            disabled={readOnly}
          />
          {errors.mobile && <span className="form-error-msg">{errors.mobile}</span>}
          <span className="form-helper-text">Primary registration number</span>
        </div>

        <div className="form-field-group">
          <label className="form-label">
            Email Address <span className="required-star">*</span>
          </label>
          <input
            type="email"
            className={`form-input ${errors.email ? 'has-error' : ''}`}
            placeholder="e.g. ramesh@example.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            disabled={readOnly}
          />
          {errors.email && <span className="form-error-msg">{errors.email}</span>}
        </div>
      </div>

      <div className="form-grid-3">
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

        <div className="form-field-group">
          <label className="form-label">ID Proof Type</label>
          <select
            className="form-select"
            value={data.idProofType || 'Aadhar Card'}
            onChange={(e) => onChange('idProofType', e.target.value)}
            disabled={readOnly}
          >
            <option value="Aadhar Card">Aadhar Card</option>
            <option value="Passport">Passport</option>
            <option value="Voter ID">Voter ID</option>
            <option value="PAN Card">PAN Card</option>
          </select>
        </div>

        <div className="form-field-group">
          <label className="form-label">ID Proof Number</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 1234 5678 9012"
            value={data.idProofNumber || ''}
            onChange={(e) => onChange('idProofNumber', e.target.value)}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Religion</label>
          <select
            className="form-select"
            value={data.religion || 'Hindu'}
            onChange={(e) => onChange('religion', e.target.value)}
            disabled={readOnly}
          >
            <option value="Hindu">Hindu</option>
            <option value="Christian">Christian</option>
            <option value="Muslim">Muslim</option>
            <option value="Caste Converted">Caste Converted</option>
          </select>
        </div>

        <div className="form-field-group">
          <label className="form-label">Marital Status</label>
          <select
            className="form-select"
            value={data.maritalStatus || 'Unmarried'}
            onChange={(e) => onChange('maritalStatus', e.target.value)}
            disabled={readOnly}
          >
            <option value="Unmarried">Unmarried</option>
            <option value="Widower">Widower</option>
            <option value="Divorced">Divorced</option>
            <option value="Waiting for Divorce">Waiting for Divorce</option>
            <option value="No Divorce">No Divorce</option>
          </select>
        </div>
      </div>
    </div>
  );
};
