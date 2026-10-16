import React, { useEffect, useState } from 'react';
import {
  fetchAgentCommissions,
  AgentCommissionResponse,
} from '../services/agentApi';
import './AgentCommissionPage.css';

export const AgentCommissionPage: React.FC = () => {
  const [data, setData] = useState<AgentCommissionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAgentCommissions();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load commission data');
      } finally {
        setLoading(false);
      }
    }
    loadCommissions();
  }, []);

  if (loading) {
    return (
      <div className="agent-commission-page">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
          <p>Loading commission data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="agent-commission-page">
        <div className="agent-warning-banner">
          <div>⚠️ {error || 'Unable to retrieve commission information'}</div>
        </div>
      </div>
    );
  }

  const { assignedConfiguration, summary, transactions } = data;

  return (
    <div className="agent-commission-page">
      {/* Header */}
      <div className="agent-commission-header">
        <h2 className="agent-commission-title">Agent Commission & Earnings</h2>
        <p className="agent-commission-subtitle">
          View your authorized commission settings, earned transaction records, and settlement terms.
        </p>
      </div>

      {/* Mandatory No Independent Wallet Policy Notice */}
      <div className="no-wallet-alert">
        <div className="no-wallet-icon">ℹ️</div>
        <div className="no-wallet-content">
          <h4>No Independent Agent Wallet Policy (Section 9.4)</h4>
          <p>
            Branch Agents and Franchise Agents <strong>do not have independent digital wallets</strong>.
            All commission amounts recorded here are strictly for auditing, sales tracking, and reporting.
            Actual commission payouts and disbursements are handled exclusively through the platform&apos;s
            offline/manual settlement workflow by administrative management.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="commission-overview-grid">
        <div className="commission-card">
          <div className="commission-card-title">Total Commission Earned</div>
          <div className="commission-card-value">
            ₹{summary.totalEarned.toLocaleString('en-IN')}
          </div>
          <div className="commission-card-sub">
            From {summary.totalTransactionsCount} approved package sales
          </div>
        </div>

        <div className="commission-card">
          <div className="commission-card-title">Authorized Commission Setting</div>
          <div className="commission-card-value">
            {assignedConfiguration
              ? `${assignedConfiguration.rateValue}${
                  assignedConfiguration.commissionType === 'PERCENTAGE' ? '%' : ' INR'
                }`
              : 'Global Default'}
          </div>
          <div className="commission-card-sub">
            Type:{' '}
            <strong>
              {assignedConfiguration?.commissionType || 'Standard Percentage'}
            </strong>{' '}
            | Scope: {assignedConfiguration?.scope || 'GLOBAL_BRANCH'}
          </div>
        </div>

        <div className="commission-card">
          <div className="commission-card-title">Settlement Status</div>
          <div className="commission-card-value" style={{ color: '#0284c7' }}>
            Offline Manual
          </div>
          <div className="commission-card-sub">
            Admin / Management scheduled payouts
          </div>
        </div>
      </div>

      {/* Transactions History Table */}
      <div className="agent-profile-table-card">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Commission Transactions History
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="agent-empty-state">
            <div className="agent-empty-icon">🎖️</div>
            <h3>No commission transactions recorded yet</h3>
            <p>
              Commissions are automatically credited when your invoice requests are approved by
              management and packages are activated.
            </p>
          </div>
        ) : (
          <div className="agent-table-wrapper">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Invoice / Request</th>
                  <th>Member ID & Name</th>
                  <th>Package Sold</th>
                  <th>Package Amount</th>
                  <th>Applied Rate</th>
                  <th>Earned Commission</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <strong>
                        {tx.invoice?.invoiceNumber || tx.invoice?.requestNumber || 'N/A'}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        {tx.invoice?.memberProfile?.memberId || 'N/A'}
                      </div>
                      <small style={{ color: '#64748b' }}>
                        {tx.invoice?.memberProfile?.firstName}{' '}
                        {tx.invoice?.memberProfile?.lastName}
                      </small>
                    </td>
                    <td>{tx.invoice?.package?.name}</td>
                    <td>₹{tx.packagePrice.toLocaleString('en-IN')}</td>
                    <td>
                      {tx.rateValue}
                      {tx.commissionType === 'PERCENTAGE' ? '%' : ' INR Fixed'}
                    </td>
                    <td>
                      <strong style={{ color: '#166534', fontSize: '15px' }}>
                        ₹{tx.commissionAmount.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>
                      <span className="status-pill status-approved">
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: '#64748b' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
