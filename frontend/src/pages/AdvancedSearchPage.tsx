import React, { useState } from 'react';
import { executeAdvancedSearch } from '../services/adminApi';
import './AdvancedSearchPage.css';

export const AdvancedSearchPage: React.FC = () => {
  const [filters, setFilters] = useState<any>({
    name: '',
    gender: '',
    maritalStatus: '',
    minAge: '',
    maxAge: '',
    minHeight: '',
    maxHeight: '',
    state: '',
    district: '',
    mandal: '',
    village: '',
    country: '',
    workingCountry: '',
    religion: '',
    caste: '',
    subCaste: '',
    interCasteAcceptable: '',
    raasi: '',
    star: '',
    educationLevel: '',
    profession: '',
    minIncome: '',
    maxIncome: '',
    hasPassport: '',
    motherTongue: '',
    withPhotoOnly: '',
  });

  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters({
      name: '',
      gender: '',
      maritalStatus: '',
      minAge: '',
      maxAge: '',
      minHeight: '',
      maxHeight: '',
      state: '',
      district: '',
      mandal: '',
      village: '',
      country: '',
      workingCountry: '',
      religion: '',
      caste: '',
      subCaste: '',
      interCasteAcceptable: '',
      raasi: '',
      star: '',
      educationLevel: '',
      profession: '',
      minIncome: '',
      maxIncome: '',
      hasPassport: '',
      motherTongue: '',
      withPhotoOnly: '',
    });
    setResults([]);
    setTotalCount(0);
    setHasSearched(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setHasSearched(true);
      // Clean empty values
      const payload: any = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== '' && filters[key] !== null) {
          if (
            ['minAge', 'maxAge', 'minHeight', 'maxHeight', 'minIncome', 'maxIncome'].includes(key)
          ) {
            payload[key] = Number(filters[key]);
          } else if (['interCasteAcceptable', 'hasPassport', 'withPhotoOnly'].includes(key)) {
            payload[key] = filters[key] === 'true';
          } else {
            payload[key] = filters[key];
          }
        }
      });

      const res = await executeAdvancedSearch(payload);
      setResults(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      alert(err.message || 'Error executing search');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="advanced-search-page">
      <div className="search-header">
        <h1>🔍 Staff Advanced Member Search</h1>
        <p>
          Multi-criteria filtering across demographic, location, astrological, educational, and
          professional parameters with role-restricted data visibility.
        </p>
      </div>

      <form className="search-filter-card" onSubmit={handleSearch}>
        {/* Personal & Demographic */}
        <div className="filter-section-title">👤 Basic Demographics</div>
        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>Name / Surname</label>
            <input
              type="text"
              name="name"
              placeholder="Search by name..."
              value={filters.name}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Gender</label>
            <select name="gender" value={filters.gender} onChange={handleChange}>
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Marital Status</label>
            <select name="maritalStatus" value={filters.maritalStatus} onChange={handleChange}>
              <option value="">Any Status</option>
              <option value="NEVER_MARRIED">Never Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
              <option value="AWAITING_DIVORCE">Awaiting Divorce</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Photos Only</label>
            <select name="withPhotoOnly" value={filters.withPhotoOnly} onChange={handleChange}>
              <option value="">All Profiles</option>
              <option value="true">With Photo Only</option>
            </select>
          </div>
        </div>

        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>Min Age (Years)</label>
            <input
              type="number"
              name="minAge"
              placeholder="e.g. 21"
              value={filters.minAge}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Max Age (Years)</label>
            <input
              type="number"
              name="maxAge"
              placeholder="e.g. 35"
              value={filters.maxAge}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Min Height (cm)</label>
            <input
              type="number"
              name="minHeight"
              placeholder="e.g. 150"
              value={filters.minHeight}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Max Height (cm)</label>
            <input
              type="number"
              name="maxHeight"
              placeholder="e.g. 190"
              value={filters.maxHeight}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Community & Religion */}
        <div className="filter-section-title">🕉️ Community & Astrology</div>
        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>Religion</label>
            <input
              type="text"
              name="religion"
              placeholder="e.g. Hindu, Christian, Muslim"
              value={filters.religion}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Caste</label>
            <input
              type="text"
              name="caste"
              placeholder="e.g. Reddy, Kamma, Brahmin, Kapu"
              value={filters.caste}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Sub-Caste</label>
            <input
              type="text"
              name="subCaste"
              placeholder="Sub-caste details..."
              value={filters.subCaste}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Inter-caste Acceptable</label>
            <select
              name="interCasteAcceptable"
              value={filters.interCasteAcceptable}
              onChange={handleChange}
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>Raasi</label>
            <input
              type="text"
              name="raasi"
              placeholder="e.g. Mesha, Vrishabha"
              value={filters.raasi}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Star / Nakshatra</label>
            <input
              type="text"
              name="star"
              placeholder="e.g. Ashwini, Bharani"
              value={filters.star}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Mother Tongue</label>
            <input
              type="text"
              name="motherTongue"
              placeholder="e.g. Telugu, English"
              value={filters.motherTongue}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Location */}
        <div className="filter-section-title">📍 Location & Overseas</div>
        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              placeholder="e.g. Andhra Pradesh, Telangana"
              value={filters.state}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>District</label>
            <input
              type="text"
              name="district"
              placeholder="e.g. Hyderabad, Krishna, Guntur"
              value={filters.district}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Mandal / Village</label>
            <input
              type="text"
              name="mandal"
              placeholder="Mandal or Village..."
              value={filters.mandal}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Working Country</label>
            <input
              type="text"
              name="workingCountry"
              placeholder="e.g. India, USA, UK, Canada"
              value={filters.workingCountry}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Education & Profession */}
        <div className="filter-section-title">💼 Education & Career</div>
        <div className="filter-grid-4col">
          <div className="filter-group">
            <label>Education Level</label>
            <input
              type="text"
              name="educationLevel"
              placeholder="e.g. B.Tech, MS, MBA, MBBS"
              value={filters.educationLevel}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Profession / Job Title</label>
            <input
              type="text"
              name="profession"
              placeholder="e.g. Software Engineer, Doctor"
              value={filters.profession}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Min Annual Income (₹)</label>
            <input
              type="number"
              name="minIncome"
              placeholder="e.g. 600000"
              value={filters.minIncome}
              onChange={handleChange}
            />
          </div>
          <div className="filter-group">
            <label>Valid Passport</label>
            <select name="hasPassport" value={filters.hasPassport} onChange={handleChange}>
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>

        <div className="search-actions-bar">
          <button type="button" className="secondary-btn" onClick={handleReset}>
            Reset Filters
          </button>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Searching Profiles...' : '🔍 Search Profiles'}
          </button>
        </div>
      </form>

      {/* Results Section */}
      {hasSearched && (
        <div className="results-card">
          <div className="results-meta">
            <h2>Matching Results ({totalCount} Profiles Found)</h2>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              No profiles found matching all selected criteria. Try broadening your search filters.
            </div>
          ) : (
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Member ID</th>
                    <th>Full Name</th>
                    <th>Gender & Age</th>
                    <th>Community</th>
                    <th>Location</th>
                    <th>Education & Profession</th>
                    <th>Package</th>
                    <th>Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((profile) => (
                    <tr key={profile.id}>
                      <td>
                        {profile.photoUrl ? (
                          <img
                            src={profile.photoUrl}
                            alt={profile.firstName}
                            className="profile-avatar-thumb"
                          />
                        ) : (
                          <span className="no-photo-badge">No Photo</span>
                        )}
                      </td>
                      <td>
                        <strong>{profile.memberId}</strong>
                      </td>
                      <td>
                        {profile.firstName} {profile.lastName}
                      </td>
                      <td>
                        <span className={`badge-gender ${profile.gender}`}>{profile.gender}</span>{' '}
                        {profile.age ? `${profile.age} yrs` : ''}
                      </td>
                      <td>
                        {profile.religion || '—'} / {profile.caste || '—'}
                      </td>
                      <td>
                        {profile.district || profile.state || '—'}
                        {profile.workingCountry ? ` (${profile.workingCountry})` : ''}
                      </td>
                      <td>
                        {profile.educationLevel || '—'}
                        <br />
                        <small style={{ color: '#64748b' }}>{profile.profession || '—'}</small>
                      </td>
                      <td>
                        <span
                          className={`badge-tag ${
                            profile.packageType === 'PAID' ? 'active' : 'inactive'
                          }`}
                        >
                          {profile.packageType || 'FREE'}
                        </span>
                      </td>
                      <td>{profile.branchName || 'HQ Main'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
