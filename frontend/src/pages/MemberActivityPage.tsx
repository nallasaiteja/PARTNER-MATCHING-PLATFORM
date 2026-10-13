import React, { useEffect, useState } from 'react';
import {
  fetchActivityViews,
  fetchRevealedContacts,
  fetchShortlist,
  fetchBlocklist,
  fetchSuggestedProfiles,
} from '../services/memberApi';
import { MatchCard } from '../components/MatchCard';
import './MemberActivityPage.css';

interface MemberActivityPageProps {
  initialTab?: 'views' | 'contacts' | 'shortlist' | 'blocklist' | 'suggested';
}

export const MemberActivityPage: React.FC<MemberActivityPageProps> = ({ initialTab = 'views' }) => {
  const [activeTab, setActiveTab] = useState<'views' | 'contacts' | 'shortlist' | 'blocklist' | 'suggested'>(initialTab);
  const [views, setViews] = useState<{ profilesSeen: any[]; seenMyProfile: any[] }>({ profilesSeen: [], seenMyProfile: [] });
  const [contacts, setContacts] = useState<any[]>([]);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchActivityViews(),
      fetchRevealedContacts(),
      fetchShortlist(),
      fetchBlocklist().catch(() => []),
      fetchSuggestedProfiles().catch(() => []),
    ])
      .then(([v, c, s, b, sug]) => {
        setViews(v || { profilesSeen: [], seenMyProfile: [] });
        setContacts(c || []);
        setShortlist(s || []);
        setBlocklist(b || []);
        setSuggested(sug || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="activity-page-container">
      <div className="activity-page-header">
        <div>
          <h2>👁️ Member Activity & Contacts History</h2>
          <p>Section 4.5: Track profiles browsed, profile visitors, and revealed contacts.</p>
        </div>
        <div className="activity-tabs-row">
          <button
            className={`act-tab ${activeTab === 'views' ? 'active' : ''}`}
            onClick={() => setActiveTab('views')}
          >
            Profile Visitors
          </button>
          <button
            className={`act-tab ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            Revealed Contacts ({contacts.length})
          </button>
          <button
            className={`act-tab ${activeTab === 'shortlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortlist')}
          >
            Shortlisted ({shortlist.length})
          </button>
          <button
            className={`act-tab ${activeTab === 'blocklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocklist')}
          >
            Blocked ({blocklist.length})
          </button>
          <button
            className={`act-tab ${activeTab === 'suggested' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggested')}
          >
            Suggested ({suggested.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner"></div>
          <p>Loading activity history...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Profile Visitors & Profiles Seen */}
          {activeTab === 'views' && (
            <div className="views-two-column-layout">
              <div className="views-card">
                <h3>Seen My Profile ({views.seenMyProfile.length})</h3>
                <p className="views-sub">Members who have viewed your matrimonial profile.</p>
                {views.seenMyProfile.length === 0 ? (
                  <p className="empty-subtext">No members have viewed your profile yet.</p>
                ) : (
                  <ul className="views-list">
                    {views.seenMyProfile.map((item, idx) => (
                      <li key={idx} className="views-list-item">
                        <div>
                          <strong>{item.name}</strong>
                          <span className="views-member-id">ID: {item.memberId}</span>
                        </div>
                        <span className="views-time">
                          {new Date(item.viewedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="views-card">
                <h3>Profiles Seen ({views.profilesSeen.length})</h3>
                <p className="views-sub">Profiles that you have recently browsed.</p>
                {views.profilesSeen.length === 0 ? (
                  <p className="empty-subtext">You haven't viewed any member profiles yet.</p>
                ) : (
                  <ul className="views-list">
                    {views.profilesSeen.map((item, idx) => (
                      <li key={idx} className="views-list-item">
                        <div>
                          <strong>{item.name}</strong>
                          <span className="views-member-id">ID: {item.memberId}</span>
                        </div>
                        <span className="views-time">
                          {new Date(item.viewedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Contacts Revealed */}
          {activeTab === 'contacts' && (
            <div className="contacts-table-card">
              <h3>Contacts History</h3>
              {contacts.length === 0 ? (
                <div className="empty-activity-box">
                  <p>No contacts revealed yet. Contact reveals are unlocked through your package.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th>Member ID</th>
                        <th>Name</th>
                        <th>Mobile Number</th>
                        <th>Email</th>
                        <th>Caste / Community</th>
                        <th>Profession</th>
                        <th>Revealed Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id}>
                          <td><code>{c.memberId}</code></td>
                          <td><strong>{c.name}</strong></td>
                          <td><span className="phone-tag">📞 {c.mobile}</span></td>
                          <td>{c.email || '—'}</td>
                          <td>{c.caste} ({c.religion})</td>
                          <td>{c.profession || '—'}</td>
                          <td>{new Date(c.revealedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Shortlisted Profiles */}
          {activeTab === 'shortlist' && (
            <div className="shortlist-grid-wrapper">
              {shortlist.length === 0 ? (
                <div className="empty-activity-box">
                  <p>No profiles shortlisted yet. Star profiles in Verified or Matched view to save them here.</p>
                </div>
              ) : (
                <div className="matches-cards-grid">
                  {shortlist.map((c) => (
                    <MatchCard key={c.id} match={c} onViewProfile={() => {}} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Blocked Profiles */}
          {activeTab === 'blocklist' && (
            <div className="blocklist-grid-wrapper">
              {blocklist.length === 0 ? (
                <div className="empty-activity-box">
                  <p>No blocked members. Profiles you block will not be able to contact you or view your profile.</p>
                </div>
              ) : (
                <div className="matches-cards-grid">
                  {blocklist.map((b) => (
                    <div key={b.id} className="view-log-card">
                      <div className="view-avatar">🚫</div>
                      <div>
                        <strong>Blocked Member: {b.blockedMember?.memberId || b.blockedMemberId}</strong>
                        <div className="view-time">Blocked on {new Date(b.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Suggested Profiles */}
          {activeTab === 'suggested' && (
            <div className="suggested-grid-wrapper">
              {suggested.length === 0 ? (
                <div className="empty-activity-box">
                  <p>Staff-suggested profiles are exclusively curated for higher-package members.</p>
                </div>
              ) : (
                <div className="matches-cards-grid">
                  {suggested.map((c) => (
                    <MatchCard key={c.id} match={c} onViewProfile={() => {}} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
