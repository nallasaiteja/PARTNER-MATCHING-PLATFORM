import React, { useEffect, useState } from 'react';
import { fetchReceivedInterests, fetchSentInterests, respondInterest } from '../services/memberApi';
import './InterestsPage.css';

export const InterestsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchReceivedInterests(), fetchSentInterests()])
      .then(([rec, s]) => {
        setReceived(rec);
        setSent(s);
      })
      .catch((err) => setError(err.message || 'Failed to load interests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRespond = async (interestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await respondInterest(interestId, status);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const list = activeTab === 'received' ? received : sent;

  return (
    <div className="interests-page-container">
      <div className="interests-page-header">
        <div>
          <h2>💌 Member Interests</h2>
          <p>Manage incoming expressions of interest and track outgoing interests.</p>
        </div>
        <div className="interests-tabs-bar">
          <button
            className={`interests-tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({received.length})
          </button>
          <button
            className={`interests-tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sent.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner"></div>
          <p>Loading your interests...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error-state">
          <p>{error}</p>
          <button onClick={loadData} className="btn-retry">Retry</button>
        </div>
      ) : list.length === 0 ? (
        <div className="empty-interests-box">
          <span className="empty-icon">📭</span>
          <h4>No {activeTab} interests yet</h4>
          <p>
            {activeTab === 'received'
              ? 'Complete your profile to receive interest requests from matching members.'
              : 'Browse Verified or Matched view to send interest to profiles you like.'}
          </p>
        </div>
      ) : (
        <div className="interests-list-grid">
          {list.map((item) => (
            <div key={item.id} className="interest-item-card">
              <div className="interest-card-main">
                <span className="interest-member-id">
                  {item.targetMemberId || item.senderMemberId}
                </span>
                <h4 className="interest-name">
                  {item.targetName || item.senderName}
                </h4>
                <div className="interest-meta">
                  <span>{item.age} yrs</span>
                  <span>•</span>
                  <span>{item.caste}</span>
                  {item.profession && (
                    <>
                      <span>•</span>
                      <span>{item.profession}</span>
                    </>
                  )}
                </div>
                <div className="interest-date">
                  {activeTab === 'received' ? 'Received on: ' : 'Sent on: '}
                  {new Date(item.receivedAt || item.sentAt).toLocaleDateString()}
                </div>
              </div>

              <div className="interest-card-actions">
                <span className={`interest-status-pill status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>

                {activeTab === 'received' && item.status === 'PENDING' && (
                  <div className="respond-btn-group">
                    <button
                      onClick={() => handleRespond(item.id, 'ACCEPTED')}
                      className="btn-accept-interest"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRespond(item.id, 'REJECTED')}
                      className="btn-reject-interest"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
