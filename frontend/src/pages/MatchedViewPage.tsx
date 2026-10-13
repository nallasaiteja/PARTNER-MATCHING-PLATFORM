import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMatchedProfiles } from '../services/memberApi';
import { MatchCard } from '../components/MatchCard';
import { MatchDetailModal } from '../components/MatchDetailModal';
import './MatchesBrowsing.css';

export const MatchedViewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
    fetchMatchedProfiles(filters)
      .then((res) => setData(res))
      .catch((err) => setError(err.message || 'Failed to load matched profiles'))
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
    fetchMatchedProfiles({ page: '1' })
      .then((res) => setData(res))
      .catch(() => {});
  };

  return (
    <div className="browsing-page-container">
      <div className="browsing-page-header">
        <div>
          <h2>✨ Matched View (Mutual Compatibility)</h2>
          <p>
            Profiles where <strong>both</strong> your partner preferences and their preferences
            are mutually compatible.
          </p>
        </div>
        {data && !data.isRestricted && (
          <span className="matches-count-badge">
            {data.total} Mutual Matches Available
          </span>
        )}
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner"></div>
          <p>Analyzing mutual partner preferences...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error-state">
          <h3>Unable to load matches</h3>
          <p>{error}</p>
          <button onClick={loadMatches} className="btn-retry">Retry</button>
        </div>
      ) : data?.isRestricted ? (
        /* Below 70% restricted state */
        <div className="browse-restricted-card">
          <span className="restricted-icon">🔒</span>
          <h3>Mutual Match Browsing Restricted</h3>
          <p className="restricted-main-msg">{data.message}</p>
          <p className="restricted-sub-msg">
            Under Section 4.2 matrimonial rules, mutual preference matches require at least{' '}
            <strong>70% profile completion</strong> (Currently: <strong>{data.completionPercentage}%</strong>).
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
        <div className="browsing-main-layout">
          {/* Filter Sidebar */}
          <form onSubmit={handleFilterSubmit} className="filter-sidebar">
            <div className="filter-sidebar-header">
              <h3>Filter Matches</h3>
              <button type="button" onClick={handleClearFilters} className="btn-clear-filters">
                Clear All
              </button>
            </div>

            <div className="filter-group">
              <label>Caste</label>
              <input
                type="text"
                placeholder="e.g. Brahmin, Reddy"
                value={filters.caste}
                onChange={(e) => setFilters({ ...filters, caste: e.target.value })}
              />
            </div>

            <div className="filter-group">
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

            <div className="filter-group">
              <label>Age Range</label>
              <div className="age-range-inputs">
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

            <div className="filter-group">
              <label>Education</label>
              <input
                type="text"
                placeholder="e.g. B.Tech, MS, MBBS"
                value={filters.education}
                onChange={(e) => setFilters({ ...filters, education: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label>Profession</label>
              <input
                type="text"
                placeholder="e.g. Software, Doctor"
                value={filters.profession}
                onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label>Location / City</label>
              <input
                type="text"
                placeholder="e.g. Hyderabad, USA"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-apply-filters">
              Apply Filters
            </button>
          </form>

          {/* Cards Grid */}
          <div className="matches-grid-wrapper">
            {data.results?.length === 0 ? (
              <div className="empty-matches-box">
                <h4>No mutually compatible matches found</h4>
                <p>Try adjusting your partner preferences or broadening search filters.</p>
              </div>
            ) : (
              <>
                <div className="matches-cards-grid">
                  {data.results.map((candidate: any) => (
                    <MatchCard
                      key={candidate.id}
                      match={candidate}
                      onViewProfile={(id) => setSelectedProfileId(id)}
                      onRevealContact={(id) => setSelectedProfileId(id)}
                    />
                  ))}
                </div>

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

      {selectedProfileId && (
        <MatchDetailModal
          profileId={selectedProfileId}
          onClose={() => setSelectedProfileId(null)}
        />
      )}
    </div>
  );
};
