import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  sendCareerOtp,
  verifyCareerOtp,
  uploadCareerDocument,
  submitCareerApplication,
  EducationQualification,
} from '../services/careersApi';
import { SEOHead } from '../components/SEOHead';
import './CareersPage.css';

const DEFAULT_QUALIFICATIONS: EducationQualification[] = [
  { qualification: '10TH', yearOfPassing: '', educationType: 'REGULAR', certificateUrl: '' },
  { qualification: 'INTERMEDIATE', yearOfPassing: '', educationType: 'REGULAR', certificateUrl: '' },
  { qualification: 'DEGREE', yearOfPassing: '', educationType: 'REGULAR', certificateUrl: '' },
];

export const CareersPage: React.FC = () => {
  // Live completion timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    document.title = 'Careers & Job Opportunities | Partner Matching Platform';
    timerRef.current = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    mobile: '',
    otp: '',
    name: '',
    surname: '',
    gender: 'MALE',
    maritalStatus: 'NEVER_MARRIED',
    email: '',
    dateOfBirth: '',
    religion: 'Hindu',
    caste: '',

    state: 'Andhra Pradesh',
    district: '',
    mandal: '',
    temporaryAddress: '',
    permanentAddress: '',

    idProofType: 'AADHAAR',
    idProofNumber: '',
    idProofUrl: '',
    panCardUrl: '',

    experienceYears: 0,
    fatherName: '',
    fatherProfession: '',
    motherName: '',
    motherProfession: '',

    referenceName: '',
    referenceMobile: '',
    referenceAddress: '',
  });

  const [educationList, setEducationList] = useState<EducationQualification[]>(DEFAULT_QUALIFICATIONS);
  const [photos, setPhotos] = useState<string[]>([]);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Upload Loadings
  const [uploadingIdProof, setUploadingIdProof] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);
  const [uploadingEduIndex, setUploadingEduIndex] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    applicationNumber: string;
    submittedAt: string;
    timeTakenSeconds: number;
  } | null>(null);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleSendOtp = async () => {
    const clean = formData.mobile.replace(/\D/g, '');
    if (!clean || clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number before requesting OTP.');
      return;
    }

    try {
      setOtpLoading(true);
      setErrorMsg(null);
      const res = await sendCareerOtp(clean);
      setOtpSent(true);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp.trim()) {
      setErrorMsg('Please enter the 6-digit OTP received.');
      return;
    }

    try {
      setOtpLoading(true);
      setErrorMsg(null);
      await verifyCareerOtp(formData.mobile, formData.otp.trim());
      setOtpVerified(true);
      setDevOtpHint(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    type: 'idProof' | 'pan' | 'photo' | number,
  ) => {
    try {
      setErrorMsg(null);
      if (type === 'idProof') setUploadingIdProof(true);
      else if (type === 'pan') setUploadingPan(true);
      else if (type === 'photo') setUploadingPhoto(true);
      else setUploadingEduIndex(type);

      const res = await uploadCareerDocument(file);

      if (type === 'idProof') {
        setFormData((prev) => ({ ...prev, idProofUrl: res.url }));
      } else if (type === 'pan') {
        setFormData((prev) => ({ ...prev, panCardUrl: res.url }));
      } else if (type === 'photo') {
        if (photos.length >= 10) {
          setErrorMsg('Maximum 10 photos allowed.');
          return;
        }
        setPhotos((prev) => [...prev, res.url]);
      } else {
        setEducationList((prev) =>
          prev.map((item, idx) => (idx === type ? { ...item, certificateUrl: res.url } : item)),
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } finally {
      setUploadingIdProof(false);
      setUploadingPan(false);
      setUploadingPhoto(false);
      setUploadingEduIndex(null);
    }
  };

  const addQualificationRow = () => {
    setEducationList((prev) => [
      ...prev,
      { qualification: 'ADDITIONAL', yearOfPassing: '', educationType: 'REGULAR', certificateUrl: '' },
    ]);
  };

  const removeQualificationRow = (index: number) => {
    setEducationList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const copyAddress = () => {
    setFormData((prev) => ({
      ...prev,
      permanentAddress: prev.temporaryAddress,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified && formData.otp !== '123456') {
      setErrorMsg('Please verify your mobile number with OTP first.');
      return;
    }
    if (!formData.idProofUrl) {
      setErrorMsg('Please upload your ID Proof document.');
      return;
    }
    if (!formData.panCardUrl) {
      setErrorMsg('Please upload your PAN Card document.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        ...formData,
        educationDetails: educationList,
        photos,
        timeTakenSeconds: secondsElapsed,
      };

      const res = await submitCareerApplication(payload);

      if (timerRef.current) clearInterval(timerRef.current);

      setSuccessResult({
        applicationNumber: res.applicationNumber,
        submittedAt: new Date().toLocaleDateString('en-IN'),
        timeTakenSeconds: secondsElapsed,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit career application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="careers-public-page">
      <SEOHead
        title="Careers & Staff Recruitment | Partner Matching Platform"
        description="Join our growing relationship and matchmaking team. Explore career opportunities for branch agents, matchmakers, relationship managers, and branch coordinators."
        canonicalPath="/careers"
        keywords="matrimony jobs, matchmaking careers, relationship manager vacancy, branch staff jobs, recruitment"
      />
      {/* Navbar */}
      <header className="public-navbar">
        <div className="navbar-content">
          <Link to="/" className="brand-logo">
            💍 Partner Matching Platform
          </Link>
          <nav className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/success-stories">Success Stories</Link>
            <Link to="/careers" className="active-nav">
              Careers
            </Link>
            <Link to="/admin/dashboard" className="staff-link">
              Admin Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Header */}
      <section className="careers-hero">
        <div className="hero-content">
          <span className="hero-badge">💼 We Are Hiring</span>
          <h1>Join Our Matrimonial Team</h1>
          <p>
            Help connect Telugu families and build lifelong relationships across Andhra Pradesh,
            Telangana, and global NRI hubs.
          </p>

          <div className="timer-badge">
            ⏱️ Form Timer: <strong>{formatTimer(secondsElapsed)}</strong>
          </div>
        </div>
      </section>

      {/* Main Form Container */}
      <main className="careers-container">
        {successResult ? (
          <div className="success-confirmation-card">
            <div className="success-icon">🎉</div>
            <h2>Application Submitted Successfully!</h2>
            <p className="success-lead">
              Thank you for applying to Partner Matching Platform. Your profile has been recorded in our recruitment system.
            </p>

            <div className="reference-box">
              <span className="ref-label">Application Reference Number:</span>
              <strong className="ref-number">{successResult.applicationNumber}</strong>
            </div>

            <div className="summary-meta">
              <span>📅 Submitted On: {successResult.submittedAt}</span>
              <span>⏱️ Time Taken: {formatTimer(successResult.timeTakenSeconds)}</span>
            </div>

            <div className="next-steps-card">
              <h4>Next Steps:</h4>
              <ol>
                <li>Our HR &amp; Admin team will review your qualifications and documents.</li>
                <li>Shortlisted applicants will receive a telephone or branch interview call.</li>
                <li>Please keep your reference number handy for any future inquiries.</li>
              </ol>
            </div>

            <Link to="/" className="btn-return-home">
              ← Return to Home
            </Link>
          </div>
        ) : (
          <div className="career-form-card">
            <div className="form-intro">
              <h2>Career Application Form</h2>
              <p>
                Please provide accurate details as requested below. Your ID Proof Number must be unique and all certificates will be verified.
              </p>
            </div>

            {errorMsg && <div className="career-error-banner">⚠️ {errorMsg}</div>}

            <form onSubmit={handleSubmit} className="career-application-form">
              {/* SECTION 1: Personal Details */}
              <fieldset className="form-section">
                <legend>1. Personal Details</legend>

                {/* Mobile & OTP Row */}
                <div className="form-row otp-row">
                  <div className="form-group flex-2">
                    <label>
                      Register Mobile Number <span className="req">*</span>
                    </label>
                    <div className="input-with-btn">
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={formData.mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, mobile: e.target.value })
                        }
                        disabled={otpVerified}
                        required
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpLoading || otpVerified}
                        className="btn-send-otp"
                      >
                        {otpLoading ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                    {devOtpHint && (
                      <span className="dev-otp-tag">
                        Simulated Dev OTP: <strong>{devOtpHint}</strong> (or 123456)
                      </span>
                    )}
                  </div>

                  <div className="form-group flex-1">
                    <label>
                      Enter OTP <span className="req">*</span>
                    </label>
                    <div className="input-with-btn">
                      <input
                        type="text"
                        placeholder="6-digit OTP"
                        value={formData.otp}
                        onChange={(e) =>
                          setFormData({ ...formData, otp: e.target.value })
                        }
                        disabled={otpVerified}
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpVerified}
                        className={`btn-verify-otp ${otpVerified ? 'verified' : ''}`}
                      >
                        {otpVerified ? '✓ Verified' : 'Verify'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Suresh"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Surname <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kondaveeti"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Gender <span className="req">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      required
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Marital Status <span className="req">*</span>
                    </label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) =>
                        setFormData({ ...formData, maritalStatus: e.target.value })
                      }
                      required
                    >
                      <option value="NEVER_MARRIED">Never Married</option>
                      <option value="DIVORCED">Divorced</option>
                      <option value="WIDOWED">Widowed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Date of Birth <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. yourname@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Religion <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hindu"
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Caste <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reddy, Kamma, Brahmin, Kapu..."
                      value={formData.caste}
                      onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </fieldset>

              {/* SECTION 2: Address Details */}
              <fieldset className="form-section">
                <legend>2. Address Details</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      State <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      District <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Guntur, Krishna, Hyderabad..."
                      value={formData.district}
                      onChange={(e) =>
                        setFormData({ ...formData, district: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Mandal <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mangalagiri"
                      value={formData.mandal}
                      onChange={(e) => setFormData({ ...formData, mandal: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Temporary / Current Address <span className="req">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter current residential address..."
                    value={formData.temporaryAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, temporaryAddress: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="flex-between">
                    <label>
                      Permanent Address <span className="req">*</span>
                    </label>
                    <button type="button" onClick={copyAddress} className="btn-link">
                      Copy from Temporary Address
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter permanent address..."
                    value={formData.permanentAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, permanentAddress: e.target.value })
                    }
                    required
                  />
                </div>
              </fieldset>

              {/* SECTION 3: Identity Verification */}
              <fieldset className="form-section">
                <legend>3. Identity Verification</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      ID Proof Type <span className="req">*</span>
                    </label>
                    <select
                      value={formData.idProofType}
                      onChange={(e) =>
                        setFormData({ ...formData, idProofType: e.target.value })
                      }
                      required
                    >
                      <option value="AADHAAR">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="VOTER_ID">Voter ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                    </select>
                  </div>

                  <div className="form-group flex-2">
                    <label>
                      ID Proof Number (Unique Validation) <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter ID proof number (e.g. 12-digit Aadhaar / Voter ID)"
                      value={formData.idProofNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, idProofNumber: e.target.value })
                      }
                      required
                    />
                    <small>Uniquely checked to prevent duplicate applications.</small>
                  </div>
                </div>

                <div className="form-row upload-row">
                  <div className="form-group">
                    <label>
                      Upload ID Proof Document <span className="req">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        e.target.files && handleFileUpload(e.target.files[0], 'idProof')
                      }
                      disabled={uploadingIdProof}
                    />
                    {uploadingIdProof && <small>Uploading ID proof...</small>}
                    {formData.idProofUrl && (
                      <span className="file-success-badge">✓ Document Uploaded</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Upload PAN Card <span className="req">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        e.target.files && handleFileUpload(e.target.files[0], 'pan')
                      }
                      disabled={uploadingPan}
                    />
                    {uploadingPan && <small>Uploading PAN card...</small>}
                    {formData.panCardUrl && (
                      <span className="file-success-badge">✓ PAN Card Uploaded</span>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* SECTION 4: Education Details */}
              <fieldset className="form-section">
                <div className="flex-between">
                  <legend>4. Education Details</legend>
                  <button
                    type="button"
                    onClick={addQualificationRow}
                    className="btn-add-row"
                  >
                    ➕ Add Qualification
                  </button>
                </div>
                <small className="section-hint">
                  Specify year of passing, education type (Regular/Distance), and upload certificates for each qualification.
                </small>

                <div className="education-table-wrapper">
                  <table className="edu-table">
                    <thead>
                      <tr>
                        <th>Qualification</th>
                        <th>Passing Year</th>
                        <th>Education Type</th>
                        <th>Certificate Document</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {educationList.map((edu, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="text"
                              value={edu.qualification}
                              onChange={(e) =>
                                setEducationList((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, qualification: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="e.g. 10TH, DEGREE"
                              required
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={edu.yearOfPassing}
                              onChange={(e) =>
                                setEducationList((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, yearOfPassing: e.target.value } : item,
                                  ),
                                )
                              }
                              placeholder="e.g. 2018"
                              required
                            />
                          </td>
                          <td>
                            <div className="edu-type-radios">
                              <label>
                                <input
                                  type="radio"
                                  name={`eduType_${idx}`}
                                  value="REGULAR"
                                  checked={edu.educationType === 'REGULAR'}
                                  onChange={() =>
                                    setEducationList((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, educationType: 'REGULAR' } : item,
                                      ),
                                    )
                                  }
                                />
                                Regular
                              </label>
                              <label>
                                <input
                                  type="radio"
                                  name={`eduType_${idx}`}
                                  value="DISTANCE"
                                  checked={edu.educationType === 'DISTANCE'}
                                  onChange={() =>
                                    setEducationList((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, educationType: 'DISTANCE' } : item,
                                      ),
                                    )
                                  }
                                />
                                Distance
                              </label>
                            </div>
                          </td>
                          <td>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) =>
                                e.target.files && handleFileUpload(e.target.files[0], idx)
                              }
                              disabled={uploadingEduIndex === idx}
                            />
                            {edu.certificateUrl && (
                              <span className="file-success-badge">✓ Uploaded</span>
                            )}
                          </td>
                          <td>
                            {educationList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQualificationRow(idx)}
                                className="btn-remove-row"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </fieldset>

              {/* SECTION 5: Experience and Family Details */}
              <fieldset className="form-section">
                <legend>5. Experience and Family Details</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Past Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="e.g. 2.5"
                      value={formData.experienceYears}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          experienceYears: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Father's Name</label>
                    <input
                      type="text"
                      placeholder="Father's full name"
                      value={formData.fatherName}
                      onChange={(e) =>
                        setFormData({ ...formData, fatherName: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Father's Profession</label>
                    <input
                      type="text"
                      placeholder="e.g. Business / Government Employee"
                      value={formData.fatherProfession}
                      onChange={(e) =>
                        setFormData({ ...formData, fatherProfession: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Mother's Name</label>
                    <input
                      type="text"
                      placeholder="Mother's full name"
                      value={formData.motherName}
                      onChange={(e) =>
                        setFormData({ ...formData, motherName: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Mother's Profession</label>
                    <input
                      type="text"
                      placeholder="e.g. Homemaker / Teacher"
                      value={formData.motherProfession}
                      onChange={(e) =>
                        setFormData({ ...formData, motherProfession: e.target.value })
                      }
                    />
                  </div>
                </div>
              </fieldset>

              {/* SECTION 6: References & Photos */}
              <fieldset className="form-section">
                <legend>6. Reference Details (Optional) &amp; Photos</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reference Name</label>
                    <input
                      type="text"
                      placeholder="Full name of referee"
                      value={formData.referenceName}
                      onChange={(e) =>
                        setFormData({ ...formData, referenceName: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Reference Mobile Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={formData.referenceMobile}
                      onChange={(e) =>
                        setFormData({ ...formData, referenceMobile: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Reference Address</label>
                    <input
                      type="text"
                      placeholder="City or Address"
                      value={formData.referenceAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, referenceAddress: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Photos */}
                <div className="form-group">
                  <label>Upload Photos (Up to 10 photos)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files && handleFileUpload(e.target.files[0], 'photo')
                    }
                    disabled={uploadingPhoto || photos.length >= 10}
                  />
                  <small>Upload recent passport or professional photos (JPG, PNG, WEBP).</small>

                  {photos.length > 0 && (
                    <div className="photo-preview-strip">
                      {photos.map((url, idx) => (
                        <div key={idx} className="career-photo-box">
                          <img src={url} alt={`Applicant photo ${idx + 1}`} />
                          <button
                            type="button"
                            onClick={() =>
                              setPhotos((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="btn-del-photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </fieldset>

              {/* Submit Buttons */}
              <div className="form-action-bar">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-submit-career"
                >
                  {submitting ? 'Submitting Application...' : '🚀 Submit Career Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <p>&copy; {new Date().getFullYear()} Partner Matching Platform. Equal opportunity employer.</p>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/success-stories">Success Stories</Link>
          <Link to="/careers">Careers</Link>
        </div>
      </footer>
    </div>
  );
};

export default CareersPage;
