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
  const isStudent = data.employedIn === 'Student';
  const isWorkingIndia = data.workingLocation === 'India';
  const isEmployed = ['Private', 'Government', 'Business'].includes(data.employedIn || '');

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
          <label className="form-label">University / College</label>
          <input
            type="text"
            className={`form-input ${errors.university ? 'has-error' : ''}`}
            placeholder="University, college, or institution name"
            value={data.university || ''}
            onChange={(e) => onChange('university', e.target.value)}
            disabled={readOnly}
          />
          {errors.university && <span className="form-error-msg">{errors.university}</span>}
        </div>
      </div>

      <div className="form-grid-2">
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

        <div className="form-field-group">
          <label className="form-label">Working Location</label>
          <select
            className={`form-select ${errors.workingLocation ? 'has-error' : ''}`}
            value={data.workingLocation || 'India'}
            onChange={(e) => onChange('workingLocation', e.target.value as any)}
            disabled={readOnly || !isEmployed}
          >
            <option value="India">Working in India</option>
            <option value="Abroad">Working Abroad (NRI)</option>
          </select>
          {errors.workingLocation && <span className="form-error-msg">{errors.workingLocation}</span>}
        </div>
      </div>

      {isStudent && (
        <div className="profile-address-section">
          <h3 className="address-section-title">Student Details</h3>
          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-label">
                Course / Degree Pursuing <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.currentEducationPursuing ? 'has-error' : ''}`}
                placeholder="e.g. B.E. Computer Science"
                value={data.currentEducationPursuing || ''}
                onChange={(e) => onChange('currentEducationPursuing', e.target.value)}
                disabled={readOnly}
              />
              {errors.currentEducationPursuing && <span className="form-error-msg">{errors.currentEducationPursuing}</span>}
            </div>

            <div className="form-field-group">
              <label className="form-label">
                University / College <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.universityStudying ? 'has-error' : ''}`}
                placeholder="University name"
                value={data.universityStudying || ''}
                onChange={(e) => onChange('universityStudying', e.target.value)}
                disabled={readOnly}
              />
              {errors.universityStudying && <span className="form-error-msg">{errors.universityStudying}</span>}
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-label">
                University Address <span className="required-star">*</span>
              </label>
              <textarea
                className={`form-textarea ${errors.universityAddress ? 'has-error' : ''}`}
                rows={3}
                placeholder="College address"
                value={data.universityAddress || ''}
                onChange={(e) => onChange('universityAddress', e.target.value)}
                disabled={readOnly}
              />
              {errors.universityAddress && <span className="form-error-msg">{errors.universityAddress}</span>}
            </div>

            <div className="form-field-group">
              <label className="form-label">
                Year / Semester <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.yearOfPursuing ? 'has-error' : ''}`}
                placeholder="e.g. 2nd Year, Semester 4"
                value={data.yearOfPursuing || ''}
                onChange={(e) => onChange('yearOfPursuing', e.target.value)}
                disabled={readOnly}
              />
              {errors.yearOfPursuing && <span className="form-error-msg">{errors.yearOfPursuing}</span>}
            </div>
          </div>
        </div>
      )}

      {isEmployed && (
        <div className="profile-address-section">
          <h3 className="address-section-title">Employment Details</h3>

          <div className="form-grid-3">
            <div className="form-field-group">
              <label className="form-label">
                Profession <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.profession ? 'has-error' : ''}`}
                placeholder="e.g. Software Engineer"
                value={data.profession || ''}
                onChange={(e) => onChange('profession', e.target.value)}
                disabled={readOnly}
              />
              {errors.profession && <span className="form-error-msg">{errors.profession}</span>}
            </div>

            <div className="form-field-group">
              <label className="form-label">
                Designation <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.designation ? 'has-error' : ''}`}
                placeholder="e.g. Senior Tech Lead"
                value={data.designation || ''}
                onChange={(e) => onChange('designation', e.target.value)}
                disabled={readOnly}
              />
              {errors.designation && <span className="form-error-msg">{errors.designation}</span>}
            </div>

            <div className="form-field-group">
              <label className="form-label">Passport Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="Passport number"
                value={data.passportNumber || ''}
                onChange={(e) => onChange('passportNumber', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field-group">
              <label className="form-label">Annual Income</label>
              <input
                type="text"
                className={`form-input ${errors.annualIncome ? 'has-error' : ''}`}
                placeholder="e.g. ₹ 15,00,000 / $ 120,000"
                value={data.annualIncome || ''}
                onChange={(e) => onChange('annualIncome', e.target.value)}
                disabled={readOnly}
              />
              {errors.annualIncome && <span className="form-error-msg">{errors.annualIncome}</span>}
              <span className="form-helper-text">Accepts any currency (INR, USD, EUR, etc.)</span>
            </div>

            <div className="form-field-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className={`form-input ${errors.companyName ? 'has-error' : ''}`}
                placeholder="e.g. Infosys, TCS, Google"
                value={data.companyName || ''}
                onChange={(e) => onChange('companyName', e.target.value)}
                disabled={readOnly}
              />
              {errors.companyName && <span className="form-error-msg">{errors.companyName}</span>}
            </div>
          </div>

          {isWorkingIndia && (
            <div className="profile-address-section">
              <h3 className="address-section-title">Working in India</h3>
              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    State <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.workingState ? 'has-error' : ''}`}
                    placeholder="State"
                    value={data.workingState || ''}
                    onChange={(e) => onChange('workingState', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workingState && <span className="form-error-msg">{errors.workingState}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    City <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.workingCity ? 'has-error' : ''}`}
                    placeholder="City"
                    value={data.workingCity || ''}
                    onChange={(e) => onChange('workingCity', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workingCity && <span className="form-error-msg">{errors.workingCity}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Working Address <span className="required-star">*</span>
                  </label>
                  <textarea
                    className={`form-textarea ${errors.workingLocationAddress ? 'has-error' : ''}`}
                    rows={3}
                    placeholder="Office / work location address"
                    value={data.workingLocationAddress || ''}
                    onChange={(e) => onChange('workingLocationAddress', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workingLocationAddress && <span className="form-error-msg">{errors.workingLocationAddress}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">Company / Office Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Company or branch name"
                    value={data.companyName || ''}
                    onChange={(e) => onChange('companyName', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Working Since <span className="required-star">*</span>
                  </label>
                  <input
                    type="month"
                    className={`form-input ${errors.workingSince ? 'has-error' : ''}`}
                    value={data.workingSince || ''}
                    onChange={(e) => onChange('workingSince', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workingSince && <span className="form-error-msg">{errors.workingSince}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Total Experience <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.totalExperience ? 'has-error' : ''}`}
                    placeholder="e.g. 5 years"
                    value={data.totalExperience || ''}
                    onChange={(e) => onChange('totalExperience', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.totalExperience && <span className="form-error-msg">{errors.totalExperience}</span>}
                </div>
              </div>
            </div>
          )}

          {!isWorkingIndia && data.workingLocation === 'Abroad' && (
            <div className="profile-address-section">
              <h3 className="address-section-title">Working Abroad</h3>
              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Country <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.workCountry ? 'has-error' : ''}`}
                    placeholder="Country"
                    value={data.workCountry || ''}
                    onChange={(e) => onChange('workCountry', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workCountry && <span className="form-error-msg">{errors.workCountry}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    State <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.workState ? 'has-error' : ''}`}
                    placeholder="State / Province"
                    value={data.workState || ''}
                    onChange={(e) => onChange('workState', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.workState && <span className="form-error-msg">{errors.workState}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Visa Type <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.visaType ? 'has-error' : ''}`}
                    placeholder="H1B / Skilled Worker / Dependent"
                    value={data.visaType || ''}
                    onChange={(e) => onChange('visaType', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.visaType && <span className="form-error-msg">{errors.visaType}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">Passport Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Passport number"
                    value={data.abroadPassportNumber || ''}
                    onChange={(e) => onChange('abroadPassportNumber', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Passport Valid From <span className="required-star">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-input ${errors.passportValidFrom ? 'has-error' : ''}`}
                    value={data.passportValidFrom || ''}
                    onChange={(e) => onChange('passportValidFrom', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.passportValidFrom && <span className="form-error-msg">{errors.passportValidFrom}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Passport Valid Till <span className="required-star">*</span>
                  </label>
                  <input
                    type="date"
                    className={`form-input ${errors.passportValidTill ? 'has-error' : ''}`}
                    value={data.passportValidTill || ''}
                    onChange={(e) => onChange('passportValidTill', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.passportValidTill && <span className="form-error-msg">{errors.passportValidTill}</span>}
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field-group">
                  <label className="form-label">
                    Company Name <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.abroadCompanyName ? 'has-error' : ''}`}
                    placeholder="Foreign employer/company"
                    value={data.abroadCompanyName || ''}
                    onChange={(e) => onChange('abroadCompanyName', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.abroadCompanyName && <span className="form-error-msg">{errors.abroadCompanyName}</span>}
                </div>

                <div className="form-field-group">
                  <label className="form-label">
                    Company Address <span className="required-star">*</span>
                  </label>
                  <textarea
                    className={`form-textarea ${errors.abroadCompanyAddress ? 'has-error' : ''}`}
                    rows={3}
                    placeholder="Employer address"
                    value={data.abroadCompanyAddress || ''}
                    onChange={(e) => onChange('abroadCompanyAddress', e.target.value)}
                    disabled={readOnly}
                  />
                  {errors.abroadCompanyAddress && <span className="form-error-msg">{errors.abroadCompanyAddress}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="profile-address-section">
        <h3 className="address-section-title">Other Details</h3>
        <div className="form-grid-2">
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

          <div className="form-field-group">
            <label className="form-label">Colleague Reference</label>
            <div className="form-grid-2" style={{ gap: '12px', marginBottom: 0 }}>
              <div className="form-field-group">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Name"
                  value={data.colleagueName || ''}
                  onChange={(e) => onChange('colleagueName', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="form-field-group">
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Mobile"
                  value={data.colleagueMobile || ''}
                  onChange={(e) => onChange('colleagueMobile', e.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
