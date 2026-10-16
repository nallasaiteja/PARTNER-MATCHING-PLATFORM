import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVerifiedMatches } from '../services/memberApi';
import { MatchCard } from '../components/MatchCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import './MatchesBrowsing.css';

export const VerifiedViewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Filters State (Section 4.4)
  const [filters, setFilters] = useState({
    caste: '',
    maritalStatus: '',
    profession: '',
    education: '',
    city: '',
    ageMin: '',
    ageMax: '',
    star: '',
    raasi: '',
    page: '1',
  });

  const loadMatches = () => {
    setLoading(true);
    setError(null);
    fetchVerifiedMatches(filters)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load verified matches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatches();
  }, [filters.page]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, page: '1' });
    loadMatches();
  };

  const handleClearFilters = () => {
    setFilters({
      caste: '',
      maritalStatus: '',
      profession: '',
      education: '',
      city: '',
      ageMin: '',
      ageMax: '',
      star: '',
      raasi: '',
      page: '1',
    });
    fetchVerifiedMatches({ page: '1' })
      .then((res) => setData(res))
      .catch(() => {});
  };

  return (
    <div className="browsing-page-container">
      <div className="browsing-page-header">
        <div>
          <h2>💍 Verified View (Community Matches)</h2>
          <p>
            Curated profiles from your community matching age eligibility and marital status.
          </p>
        </div>
        {data && !data.isRestricted && (
          <span className="matches-count-badge">
            {data.total} Profiles Available
          </span>
        )}
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner"></div>
          <p>Finding verified matches in your community...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error-state">
          <h3>Unable to load matches</h3>
          <p>{error}</p>
          <button onClick={loadMatches} className="btn-retry">Retry</button>
        </div>
      ) : data?.isRestricted ? (
        /* SECTION 4.2: Restricted State below 70% */
        <div className="browse-restricted-card">
          <span className="restricted-icon">🔒</span>
          <h3>Profile Completion Restricted</h3>
          <p className="restricted-main-msg">{data.message}</p>
          <p className="restricted-sub-msg">
            Under Section 4.2 matrimonial privacy rules, individual match profiles remain hidden
            until your profile reaches at least <strong>70% completion</strong> (Currently:{' '}
            <strong>{data.completionPercentage}%</strong>).
          </p>

          {data.missingFields?.length > 0 && (
            <div className="restricted-checklist">
              <h5>Missing Details Required:</h5>
              <ul>
                {data.missingFields.map((f: string, idx: number) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <Link to="/member/profile" className="btn-restricted-complete">
            Complete Profile Now →
          </Link>
        </div>
      ) : (
        /* Unlocked Browsing Layout */
        <div className="matched-horizontal-page-layout">
          {/* Top Horizontal Filter Bar */}
          <form onSubmit={handleFilterSubmit} className="filters-top-bar">
            <div className="filters-top-bar-header">
              <div className="filters-top-title">
                <span className="filter-icon">🔍</span>
                <h3>Filter Community Verified Profiles</h3>
              </div>
              <div className="filter-top-actions">
                <button type="button" onClick={handleClearFilters} className="btn-clear-filters-top">
                  Clear All
                </button>
                <button type="submit" className="btn-apply-filters-top">
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="filters-horizontal-fields">
              <div className="filter-field-inline">
                <label>Caste</label>
                <input
                  type="text"
                  placeholder="e.g. Brahmin, Reddy, Kamma"
                  value={filters.caste}
                  onChange={(e) => setFilters({ ...filters, caste: e.target.value })}
                />
              </div>

              <div className="filter-field-inline">
                <label>Marital Status</label>
                <select
                  value={filters.maritalStatus}
                  onChange={(e) => setFilters({ ...filters, maritalStatus: e.target.value })}
                >
                  <option value="">Any Status</option>
                  <option value="Unmarried">Unmarried</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>

              <div className="filter-field-inline">
                <label>Age Range</label>
                <div className="filter-age-range-inline">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.ageMin}
                    onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.ageMax}
                    onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
                  />
                </div>
              </div>

              <div className="filter-field-inline">
                <label>Education</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech, MBA, MS"
                  value={filters.education}
                  onChange={(e) => setFilters({ ...filters, education: e.target.value })}
                />
              </div>

              <div className="filter-field-inline">
                <label>Profession</label>
                <input
                  type="text"
                  placeholder="e.g. Software, Doctor"
                  value={filters.profession}
                  onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
                />
              </div>

              <div className="filter-field-inline">
                <label>Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. Hyderabad, USA"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                />
              </div>

              <div className="filter-field-inline">
                <label>Star / Nakshatram</label>
                <input
                  type="text"
                  placeholder="e.g. Magha, Rohini"
                  value={filters.star}
                  onChange={(e) => setFilters({ ...filters, star: e.target.value })}
                />
              </div>

              <div className="filter-field-inline">
                <label>Raasi / Moon Sign</label>
                <input
                  type="text"
                  placeholder="e.g. Simha, Mesha"
                  value={filters.raasi}
                  onChange={(e) => setFilters({ ...filters, raasi: e.target.value })}
                />
              </div>
            </div>
          </form>

          {/* Horizontal Direction Matched Profile Cards */}
          <div className="matches-grid-wrapper">
            {data.results?.length === 0 ? (
              <div className="empty-matches-box">
                <h4>No matching community profiles found</h4>
                <p>Try broadening your filters or check back soon as new community members register.</p>
              </div>
            ) : (
              <>
                <div className="matches-cards-grid-horizontal">
                  {data.results.map((candidate: any) => (
                    <MatchCard
                      key={candidate.id}
                      match={candidate}
                      onViewProfile={(id) => setSelectedProfileId(id)}
                      onRevealContact={(id) => setSelectedProfileId(id)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="pagination-row">
                    <button
                      disabled={data.page <= 1}
                      onClick={() => setFilters({ ...filters, page: String(data.page - 1) })}
                      className="btn-page"
                    >
                      ← Previous
                    </button>
                    <span className="page-indicator">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <button
                      disabled={data.page >= data.totalPages}
                      onClick={() => setFilters({ ...filters, page: String(data.page + 1) })}
                      className="btn-page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedProfileId && (
        <MatchDetailModal
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
};
