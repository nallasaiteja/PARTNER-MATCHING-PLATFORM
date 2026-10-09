import React from 'react';
import { Step5Data, StepValidationErrors } from '../../types/profile';
import './StepFormStyles.css';

interface Step5Props {
  data: Step5Data;
  onChange: (field: string, value: any) => void;
  errors: StepValidationErrors;
  readOnly?: boolean;
}

export const Step5VerificationSettings: React.FC<Step5Props> = ({
  data,
  onChange,
  errors,
  readOnly = false,
}) => {
  return (
    <div className="step-card-panel">
      <div className="step-panel-header">
        <span className="step-badge-pill">Section 3 · Step 5</span>
        <h2 className="step-panel-title">Verification & Settings</h2>
        <p className="step-panel-desc">
          ID verification, privacy settings, and package preferences. (Section 3 — Page 11)
        </p>
      </div>

      <div className="spec-notice-banner">
        <span className="spec-notice-icon">🔒</span>
        <div>
          <strong>Architecture Scope:</strong> Verification hooks trigger OTP generation for Mobile and Email.
          Mobile revelation controls privacy visibility on matches.
        </div>
      </div>

      <div className="form-field-group" style={{ marginBottom: '22px' }}>
        <label className="form-label">
          Mobile Number Revelation Preference <span className="required-star">*</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '6px' }}>
          {[
            { id: '0 Hours', label: '0 Hours', desc: 'Auto reveal immediately to all matching members' },
            { id: '24 Hours', label: '24 Hours', desc: 'Auto reveal after 24 hours' },
            { id: '72 Hours', label: '72 Hours', desc: 'Auto reveal after 72 hours' },
            { id: 'Acceptance Preference', label: 'Acceptance Preference', desc: 'Reveal only after mutual acceptance' },
          ].map((item) => {
            const isSelected = data.mobileRevelationPreference === item.id;
            return (
              <label
                key={item.id}
                style={{
                  border: isSelected ? '2px solid var(--primary-color)' : '1px solid #cbd5e1',
                  background: isSelected ? 'rgba(233, 30, 99, 0.04)' : '#ffffff',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="radio"
                    name="mobileRevelationPreference"
                    value={item.id}
                    checked={isSelected}
                    onChange={() => onChange('mobileRevelationPreference', item.id)}
                    disabled={readOnly}
                  />
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', paddingLeft: '22px' }}>{item.desc}</span>
              </label>
            );
          })}
        </div>
        {errors.mobileRevelationPreference && (
          <span className="form-error-msg">{errors.mobileRevelationPreference}</span>
        )}
      </div>

      <div className="form-grid-2">
        <div className="form-field-group">
          <label className="form-label">Willing to Take Paid Membership Package?</label>
          <div className="radio-group-row">
            <label className="radio-label">
              <input
                type="radio"
                name="willingPackage"
                checked={data.willingToTakePackage === true}
                onChange={() => onChange('willingToTakePackage', true)}
                disabled={readOnly}
              />
              Yes, Interested in Paid Package
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="willingPackage"
                checked={data.willingToTakePackage === false}
                onChange={() => onChange('willingToTakePackage', false)}
                disabled={readOnly}
              />
              No, Free Plan for now
            </label>
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-label">Planned Payment Date (Optional)</label>
          <input
            type="date"
            className="form-input"
            value={data.paymentInterestDate || ''}
            onChange={(e) => onChange('paymentInterestDate', e.target.value)}
            disabled={readOnly}
          />
          <span className="form-helper-text">Triggers automated alert to branch on this date</span>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
          Verification Status Checklist
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.mobileVerified ? '✅' : '⏳'}</span>
            <span>Mobile OTP Verification: <strong>{data.mobileVerified ? 'Verified' : 'Pending Verification'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.emailVerified ? '✅' : '⏳'}</span>
            <span>Email Verification: <strong>{data.emailVerified ? 'Verified' : 'Pending Verification'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{data.idProofVerified ? '✅' : '⏳'}</span>
            <span>ID Proof Admin Audit: <strong>{data.idProofVerified ? 'Approved' : 'Pending Admin Verification'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
