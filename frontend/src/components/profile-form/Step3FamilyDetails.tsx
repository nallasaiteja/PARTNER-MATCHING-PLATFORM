import React from 'react';
import { Step3Data, StepValidationErrors, SiblingRecord } from '../../types/profile';
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
  const fatherAlive = data.fatherStatus === 'Alive';
  const motherAlive = data.motherStatus === 'Alive';

  const updateSibling = (
    type: 'brothers' | 'sisters',
    index: number,
    field: keyof SiblingRecord,
    value: string | number,
  ) => {
    const current = [...((data[type] || []) as SiblingRecord[])];
    current[index] = {
      ...(current[index] || { name: '', age: 0, maritalStatus: '', relation: 'Elder' }),
      [field]: value,
    };
    onChange(type, current);
  };

  const renderSiblingSection = (
    type: 'brothers' | 'sisters',
    title: string,
    count: number,
  ) => {
    const entries = Array.from({ length: count }, (_, index) => ({
      ...(data[type]?.[index] || { name: '', age: 0, maritalStatus: '', relation: 'Elder' }),
    }));

    return (
      <div className="profile-address-section">
        <h3 className="address-section-title">{title}</h3>
        {entries.map((entry, index) => (
          <div key={`${type}-${index}`} className="form-grid-3" style={{ marginBottom: '16px' }}>
            <div className="form-field-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className={`form-input ${errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_name`] ? 'has-error' : ''}`}
                value={entry.name || ''}
                onChange={(e) => updateSibling(type, index, 'name', e.target.value)}
                disabled={readOnly}
              />
              {errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_name`] && (
                <span className="form-error-msg">{errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_name`]}</span>
              )}
            </div>

            <div className="form-field-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                min={0}
                className={`form-input ${errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_age`] ? 'has-error' : ''}`}
                value={entry.age ?? 0}
                onChange={(e) => updateSibling(type, index, 'age', Number(e.target.value) || 0)}
                disabled={readOnly}
              />
              {errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_age`] && (
                <span className="form-error-msg">{errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_age`]}</span>
              )}
            </div>

            <div className="form-field-group">
              <label className="form-label">Marital Status</label>
              <input
                type="text"
                className={`form-input ${errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_maritalStatus`] ? 'has-error' : ''}`}
                value={entry.maritalStatus || ''}
                onChange={(e) => updateSibling(type, index, 'maritalStatus', e.target.value)}
                placeholder="Unmarried / Married"
                disabled={readOnly}
              />
              {errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_maritalStatus`] && (
                <span className="form-error-msg">{errors[`${type === 'brothers' ? 'brother' : 'sister'}_${index}_maritalStatus`]}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

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

      <div className="profile-address-section">
        <h3 className="address-section-title">Father Details</h3>
        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label">
              Father&apos;s Name <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.fatherName ? 'has-error' : ''}`}
              value={data.fatherName || ''}
              onChange={(e) => onChange('fatherName', e.target.value)}
              disabled={readOnly}
            />
            {errors.fatherName && <span className="form-error-msg">{errors.fatherName}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">
              Religion <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.fatherReligion ? 'has-error' : ''}`}
              value={data.fatherReligion || ''}
              onChange={(e) => onChange('fatherReligion', e.target.value)}
              disabled={readOnly}
            />
            {errors.fatherReligion && <span className="form-error-msg">{errors.fatherReligion}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">
              Caste <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.fatherCaste ? 'has-error' : ''}`}
              value={data.fatherCaste || ''}
              onChange={(e) => onChange('fatherCaste', e.target.value)}
              disabled={readOnly}
            />
            {errors.fatherCaste && <span className="form-error-msg">{errors.fatherCaste}</span>}
          </div>
        </div>

        <div className="form-grid-3" style={{ marginTop: '18px' }}>
          <div className="form-field-group">
            <label className="form-label">Caste Converted</label>
            <select
              className="form-select"
              value={data.fatherCasteConverted ? 'Yes' : 'No'}
              onChange={(e) => onChange('fatherCasteConverted', e.target.value === 'Yes')}
              disabled={readOnly}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={data.fatherStatus}
              onChange={(e) => onChange('fatherStatus', e.target.value as 'Alive' | 'Late')}
              disabled={readOnly}
            >
              <option value="Alive">Alive</option>
              <option value="Late">Late</option>
            </select>
          </div>

          <div className="form-field-group">
            <label className="form-label">Employment Status</label>
            <input
              type="text"
              className={`form-input ${errors.fatherEmployment ? 'has-error' : ''}`}
              value={data.fatherEmployment || ''}
              onChange={(e) => onChange('fatherEmployment', e.target.value)}
              disabled={readOnly || !fatherAlive}
              placeholder="Private / Government / Business"
            />
            {errors.fatherEmployment && <span className="form-error-msg">{errors.fatherEmployment}</span>}
          </div>
        </div>

        {fatherAlive && (
          <>
            <div className="form-grid-3" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Health Condition</label>
                <input
                  type="text"
                  className={`form-input ${errors.fatherHealthCondition ? 'has-error' : ''}`}
                  value={data.fatherHealthCondition || ''}
                  onChange={(e) => onChange('fatherHealthCondition', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherHealthCondition && <span className="form-error-msg">{errors.fatherHealthCondition}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className={`form-input ${errors.fatherMobile ? 'has-error' : ''}`}
                  value={data.fatherMobile || ''}
                  onChange={(e) => onChange('fatherMobile', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherMobile && <span className="form-error-msg">{errors.fatherMobile}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Profession</label>
                <input
                  type="text"
                  className={`form-input ${errors.fatherProfession ? 'has-error' : ''}`}
                  value={data.fatherProfession || ''}
                  onChange={(e) => onChange('fatherProfession', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherProfession && <span className="form-error-msg">{errors.fatherProfession}</span>}
              </div>
            </div>

            <div className="form-grid-3" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Annual Income</label>
                <input
                  type="text"
                  className={`form-input ${errors.fatherAnnualIncome ? 'has-error' : ''}`}
                  value={data.fatherAnnualIncome || ''}
                  onChange={(e) => onChange('fatherAnnualIncome', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherAnnualIncome && <span className="form-error-msg">{errors.fatherAnnualIncome}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className={`form-input ${errors.fatherDesignation ? 'has-error' : ''}`}
                  value={data.fatherDesignation || ''}
                  onChange={(e) => onChange('fatherDesignation', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherDesignation && <span className="form-error-msg">{errors.fatherDesignation}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Pension Details</label>
                <input
                  type="text"
                  className={`form-input ${errors.fatherPension ? 'has-error' : ''}`}
                  value={data.fatherPension || ''}
                  onChange={(e) => onChange('fatherPension', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherPension && <span className="form-error-msg">{errors.fatherPension}</span>}
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Address</label>
                <textarea
                  className={`form-textarea ${errors.fatherAddress ? 'has-error' : ''}`}
                  rows={3}
                  value={data.fatherAddress || ''}
                  onChange={(e) => onChange('fatherAddress', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherAddress && <span className="form-error-msg">{errors.fatherAddress}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Property Details</label>
                <textarea
                  className={`form-textarea ${errors.fatherProperty ? 'has-error' : ''}`}
                  rows={3}
                  value={data.fatherProperty || ''}
                  onChange={(e) => onChange('fatherProperty', e.target.value)}
                  disabled={readOnly}
                />
                {errors.fatherProperty && <span className="form-error-msg">{errors.fatherProperty}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">Mother Details</h3>
        <div className="form-grid-3">
          <div className="form-field-group">
            <label className="form-label">
              Mother&apos;s Name <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.motherName ? 'has-error' : ''}`}
              value={data.motherName || ''}
              onChange={(e) => onChange('motherName', e.target.value)}
              disabled={readOnly}
            />
            {errors.motherName && <span className="form-error-msg">{errors.motherName}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">Mother&apos;s Maiden Name</label>
            <input
              type="text"
              className="form-input"
              value={data.motherMaidenName || ''}
              onChange={(e) => onChange('motherMaidenName', e.target.value)}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={data.motherStatus}
              onChange={(e) => onChange('motherStatus', e.target.value as 'Alive' | 'Late')}
              disabled={readOnly}
            >
              <option value="Alive">Alive</option>
              <option value="Late">Late</option>
            </select>
          </div>
        </div>

        <div className="form-grid-3" style={{ marginTop: '18px' }}>
          <div className="form-field-group">
            <label className="form-label">
              Religion <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.motherReligion ? 'has-error' : ''}`}
              value={data.motherReligion || ''}
              onChange={(e) => onChange('motherReligion', e.target.value)}
              disabled={readOnly}
            />
            {errors.motherReligion && <span className="form-error-msg">{errors.motherReligion}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">
              Caste <span className="required-star">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.motherCaste ? 'has-error' : ''}`}
              value={data.motherCaste || ''}
              onChange={(e) => onChange('motherCaste', e.target.value)}
              disabled={readOnly}
            />
            {errors.motherCaste && <span className="form-error-msg">{errors.motherCaste}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">Caste Converted</label>
            <select
              className="form-select"
              value={data.motherCasteConverted ? 'Yes' : 'No'}
              onChange={(e) => onChange('motherCasteConverted', e.target.value === 'Yes')}
              disabled={readOnly}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        {motherAlive && (
          <>
            <div className="form-grid-3" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Health Condition</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherHealthCondition ? 'has-error' : ''}`}
                  value={data.motherHealthCondition || ''}
                  onChange={(e) => onChange('motherHealthCondition', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherHealthCondition && <span className="form-error-msg">{errors.motherHealthCondition}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Working Sector</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherWorkingSector ? 'has-error' : ''}`}
                  value={data.motherWorkingSector || ''}
                  onChange={(e) => onChange('motherWorkingSector', e.target.value)}
                  disabled={readOnly}
                  placeholder="Private / Govt / Business / Housewife"
                />
                {errors.motherWorkingSector && <span className="form-error-msg">{errors.motherWorkingSector}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Employment Status</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherEmployment ? 'has-error' : ''}`}
                  value={data.motherEmployment || ''}
                  onChange={(e) => onChange('motherEmployment', e.target.value)}
                  disabled={readOnly}
                  placeholder="Employment / Housewife"
                />
                {errors.motherEmployment && <span className="form-error-msg">{errors.motherEmployment}</span>}
              </div>
            </div>

            <div className="form-grid-3" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Mobile Number</label>
                <input
                  type="tel"
                  className={`form-input ${errors.motherMobile ? 'has-error' : ''}`}
                  value={data.motherMobile || ''}
                  onChange={(e) => onChange('motherMobile', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherMobile && <span className="form-error-msg">{errors.motherMobile}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Profession</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherProfession ? 'has-error' : ''}`}
                  value={data.motherProfession || ''}
                  onChange={(e) => onChange('motherProfession', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherProfession && <span className="form-error-msg">{errors.motherProfession}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Annual Income</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherAnnualIncome ? 'has-error' : ''}`}
                  value={data.motherAnnualIncome || ''}
                  onChange={(e) => onChange('motherAnnualIncome', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherAnnualIncome && <span className="form-error-msg">{errors.motherAnnualIncome}</span>}
              </div>
            </div>

            <div className="form-grid-3" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Designation</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherDesignation ? 'has-error' : ''}`}
                  value={data.motherDesignation || ''}
                  onChange={(e) => onChange('motherDesignation', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherDesignation && <span className="form-error-msg">{errors.motherDesignation}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Pension Details</label>
                <input
                  type="text"
                  className={`form-input ${errors.motherPension ? 'has-error' : ''}`}
                  value={data.motherPension || ''}
                  onChange={(e) => onChange('motherPension', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherPension && <span className="form-error-msg">{errors.motherPension}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Mother&apos;s Housewife Option</label>
                <select
                  className="form-select"
                  value={data.motherEmployment === 'Housewife' ? 'Housewife' : 'Employment'}
                  onChange={(e) => onChange('motherEmployment', e.target.value)}
                  disabled={readOnly}
                >
                  <option value="Employment">Employment</option>
                  <option value="Housewife">Housewife</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: '18px' }}>
              <div className="form-field-group">
                <label className="form-label">Address</label>
                <textarea
                  className={`form-textarea ${errors.motherAddress ? 'has-error' : ''}`}
                  rows={3}
                  value={data.motherAddress || ''}
                  onChange={(e) => onChange('motherAddress', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherAddress && <span className="form-error-msg">{errors.motherAddress}</span>}
              </div>

              <div className="form-field-group">
                <label className="form-label">Property Details</label>
                <textarea
                  className={`form-textarea ${errors.motherProperty ? 'has-error' : ''}`}
                  rows={3}
                  value={data.motherProperty || ''}
                  onChange={(e) => onChange('motherProperty', e.target.value)}
                  disabled={readOnly}
                />
                {errors.motherProperty && <span className="form-error-msg">{errors.motherProperty}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">Family Addresses</h3>
        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label">
              Permanent Address <span className="required-star">*</span>
            </label>
            <textarea
              className={`form-textarea ${errors.familyPermanentAddress ? 'has-error' : ''}`}
              rows={3}
              value={data.familyPermanentAddress || ''}
              onChange={(e) => onChange('familyPermanentAddress', e.target.value)}
              disabled={readOnly}
            />
            {errors.familyPermanentAddress && <span className="form-error-msg">{errors.familyPermanentAddress}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">
              Present Address <span className="required-star">*</span>
            </label>
            <textarea
              className={`form-textarea ${errors.familyPresentAddress ? 'has-error' : ''}`}
              rows={3}
              value={data.familyPresentAddress || ''}
              onChange={(e) => onChange('familyPresentAddress', e.target.value)}
              disabled={readOnly}
            />
            {errors.familyPresentAddress && <span className="form-error-msg">{errors.familyPresentAddress}</span>}
          </div>
        </div>
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">Siblings</h3>
        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label">Number of Brothers</label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={data.numberOfBrothers || 0}
              onChange={(e) => {
                const nextCount = Number.parseInt(e.target.value, 10) || 0;
                onChange('numberOfBrothers', nextCount);
                const next = [...(data.brothers || [])];
                while (next.length < nextCount) {
                  next.push({ name: '', age: 0, maritalStatus: '', relation: 'Elder' });
                }
                onChange('brothers', next.slice(0, nextCount));
              }}
              disabled={readOnly}
            />
          </div>

          <div className="form-field-group">
            <label className="form-label">Number of Sisters</label>
            <input
              type="number"
              min={0}
              className="form-input"
              value={data.numberOfSisters || 0}
              onChange={(e) => {
                const nextCount = Number.parseInt(e.target.value, 10) || 0;
                onChange('numberOfSisters', nextCount);
                const next = [...(data.sisters || [])];
                while (next.length < nextCount) {
                  next.push({ name: '', age: 0, maritalStatus: '', relation: 'Elder' });
                }
                onChange('sisters', next.slice(0, nextCount));
              }}
              disabled={readOnly}
            />
          </div>
        </div>

        {renderSiblingSection('brothers', 'Brothers', data.numberOfBrothers || 0)}
        {renderSiblingSection('sisters', 'Sisters', data.numberOfSisters || 0)}
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">Reference Details</h3>
        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label">Reference Name</label>
            <input
              type="text"
              className={`form-input ${errors.referenceName ? 'has-error' : ''}`}
              value={data.referenceName || ''}
              onChange={(e) => onChange('referenceName', e.target.value)}
              disabled={readOnly}
            />
            {errors.referenceName && <span className="form-error-msg">{errors.referenceName}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">Reference Mobile</label>
            <input
              type="tel"
              className={`form-input ${errors.referenceMobile ? 'has-error' : ''}`}
              value={data.referenceMobile || ''}
              onChange={(e) => onChange('referenceMobile', e.target.value)}
              disabled={readOnly}
            />
            {errors.referenceMobile && <span className="form-error-msg">{errors.referenceMobile}</span>}
          </div>
        </div>

        <div className="form-grid-2" style={{ marginTop: '18px' }}>
          <div className="form-field-group">
            <label className="form-label">Relation</label>
            <input
              type="text"
              className={`form-input ${errors.referenceRelation ? 'has-error' : ''}`}
              value={data.referenceRelation || ''}
              onChange={(e) => onChange('referenceRelation', e.target.value)}
              disabled={readOnly}
            />
            {errors.referenceRelation && <span className="form-error-msg">{errors.referenceRelation}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">Reference Address</label>
            <textarea
              className={`form-textarea ${errors.referenceAddress ? 'has-error' : ''}`}
              rows={3}
              value={data.referenceAddress || ''}
              onChange={(e) => onChange('referenceAddress', e.target.value)}
              disabled={readOnly}
            />
            {errors.referenceAddress && <span className="form-error-msg">{errors.referenceAddress}</span>}
          </div>
        </div>
      </div>

      <div className="profile-address-section">
        <h3 className="address-section-title">Family Classification</h3>
        <div className="form-grid-2">
          <div className="form-field-group">
            <label className="form-label">Family Status</label>
            <select
              className={`form-select ${errors.familyStatus ? 'has-error' : ''}`}
              value={data.familyStatus}
              onChange={(e) => onChange('familyStatus', e.target.value as 'Rich' | 'Middle Class' | 'Average')}
              disabled={readOnly}
            >
              <option value="Rich">Rich</option>
              <option value="Middle Class">Middle Class</option>
              <option value="Average">Average</option>
            </select>
            {errors.familyStatus && <span className="form-error-msg">{errors.familyStatus}</span>}
          </div>

          <div className="form-field-group">
            <label className="form-label">Family Type</label>
            <select
              className={`form-select ${errors.familyType ? 'has-error' : ''}`}
              value={data.familyType}
              onChange={(e) => onChange('familyType', e.target.value as 'Nuclear Family' | 'Joint Family')}
              disabled={readOnly}
            >
              <option value="Nuclear Family">Nuclear Family</option>
              <option value="Joint Family">Joint Family</option>
            </select>
            {errors.familyType && <span className="form-error-msg">{errors.familyType}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
