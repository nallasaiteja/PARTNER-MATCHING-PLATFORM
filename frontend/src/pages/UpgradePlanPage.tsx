import React, { useEffect, useState } from 'react';
import { fetchPackages, fetchPaymentDetails, upgradePackage } from '../services/memberApi';
import './UpgradePlanPage.css';

export const UpgradePlanPage: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upgrade Modal State
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'ONLINE' | 'CARD' | 'EMI' | 'CASH'>('UPI');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([fetchPackages(), fetchPaymentDetails()])
      .then(([pkgs, bank]) => {
        setPackages(pkgs);
        setBankDetails(bank);
      })
      .catch((err) => setError(err.message || 'Failed to load packages'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      const res = await upgradePackage(selectedPkg.id, paymentMode, notes);
      setInvoiceResult(res);
    } catch (err: any) {
      alert(err.message || 'Upgrade request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="upgrade-page-container">
      <div className="upgrade-hero-banner">
        <h2>💎 Upgrade Membership Plan</h2>
        <p>
          Unlock verified contact numbers, view photos, send direct interests, and receive priority
          matchmaker assistance.
        </p>
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner"></div>
          <p>Loading available membership packages...</p>
        </div>
      ) : error ? (
        <div className="dashboard-error-state">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-retry">Retry</button>
        </div>
      ) : (
        <>
          {/* Packages Cards Grid */}
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`package-card ${pkg.featuredProfileEligible ? 'featured-package' : ''}`}
              >
                {pkg.featuredProfileEligible && (
                  <div className="featured-ribbon">Most Popular</div>
                )}
                <div className="pkg-card-header">
                  <h3 className="pkg-title">{pkg.name}</h3>
                  <div className="pkg-price-row">
                    <span className="currency-symbol">₹</span>
                    <span className="price-amount">{pkg.cost.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="validity-badge">{pkg.validityDays} Days Validity</span>
                </div>

                <div className="pkg-features-list">
                  <div className="feature-item">
                    <span className="feat-icon">📞</span>
                    <span><strong>{pkg.contactReveals}</strong> Contact Reveals</span>
                  </div>
                  <div className="feature-item">
                    <span className="feat-icon">🎫</span>
                    <span><strong>{pkg.ticketQuota}</strong> Support Tickets</span>
                  </div>
                  <div className="feature-item">
                    <span className="feat-icon">💳</span>
                    <span>{pkg.emiEligible ? 'EMI Option Available' : 'One-time Payment'}</span>
                  </div>
                  <div className="feature-item">
                    <span className="feat-icon">🛡️</span>
                    <span>WhatsApp Biodata with Logo</span>
                  </div>
                  <div className="services-desc-box">
                    <p>{pkg.servicesProvided}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedPkg(pkg);
                    setInvoiceResult(null);
                  }}
                  className="btn-select-package"
                >
                  Select {pkg.name}
                </button>
              </div>
            ))}
          </div>

          {/* Free vs Paid Comparison Matrix */}
          <div className="comparison-table-card">
            <h3>Membership Benefits Comparison</h3>
            <div className="table-responsive">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Free Member</th>
                    <th>Paid Member</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Profile Browsing</td>
                    <td>Yes (Basic fields only)</td>
                    <td>Yes (Full details)</td>
                  </tr>
                  <tr>
                    <td>Profile Photos</td>
                    <td>🔒 Hidden</td>
                    <td>✅ Full Access</td>
                  </tr>
                  <tr>
                    <td>Contact Numbers</td>
                    <td>🔒 Hidden</td>
                    <td>✅ Reveals per Package Quota</td>
                  </tr>
                  <tr>
                    <td>Send Direct Interests</td>
                    <td>Limited</td>
                    <td>✅ Unlimited while reveals last</td>
                  </tr>
                  <tr>
                    <td>Service Team Support</td>
                    <td>Branch Desk only</td>
                    <td>✅ Dedicated HQ & Branch Staff</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Upgrade / Payment Modal */}
      {selectedPkg && (
        <div className="upgrade-modal-overlay">
          <div className="upgrade-modal-box">
            <button
              className="upgrade-modal-close"
              onClick={() => setSelectedPkg(null)}
            >
              ✕
            </button>

            {!invoiceResult ? (
              <form onSubmit={handleUpgradeSubmit}>
                <h3>Upgrade to {selectedPkg.name}</h3>
                <div className="upgrade-summary-row">
                  <span>Package Cost:</span>
                  <strong>₹{selectedPkg.cost.toLocaleString('en-IN')}</strong>
                </div>

                {/* Payment Mode Selector */}
                <div className="payment-modes-section">
                  <label>Select Payment Method:</label>
                  <div className="modes-radio-grid">
                    <label className={`mode-card ${paymentMode === 'UPI' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="UPI"
                        checked={paymentMode === 'UPI'}
                        onChange={() => setPaymentMode('UPI')}
                      />
                      <span>UPI (GPay, PhonePe)</span>
                    </label>

                    <label className={`mode-card ${paymentMode === 'ONLINE' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="ONLINE"
                        checked={paymentMode === 'ONLINE'}
                        onChange={() => setPaymentMode('ONLINE')}
                      />
                      <span>Net Banking</span>
                    </label>

                    <label className={`mode-card ${paymentMode === 'CARD' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="CARD"
                        checked={paymentMode === 'CARD'}
                        onChange={() => setPaymentMode('CARD')}
                      />
                      <span>Debit / Credit Card</span>
                    </label>

                    {selectedPkg.emiEligible && (
                      <label className={`mode-card ${paymentMode === 'EMI' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMode"
                          value="EMI"
                          checked={paymentMode === 'EMI'}
                          onChange={() => setPaymentMode('EMI')}
                        />
                        <span>Easy EMI</span>
                      </label>
                    )}

                    <label className={`mode-card ${paymentMode === 'CASH' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMode"
                        value="CASH"
                        checked={paymentMode === 'CASH'}
                        onChange={() => setPaymentMode('CASH')}
                      />
                      <span>Cash at Branch</span>
                    </label>
                  </div>
                </div>

                {/* Mode Specific Info */}
                {paymentMode === 'UPI' && bankDetails && (
                  <div className="mode-details-box">
                    <h5>Scan UPI QR or Pay to UPI ID:</h5>
                    <div className="upi-details-row">
                      <div className="upi-text-info">
                        <p><strong>UPI ID:</strong> {bankDetails.upiId}</p>
                        <p><strong>Account Name:</strong> {bankDetails.accountHolder}</p>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMode === 'ONLINE' && bankDetails && (
                  <div className="mode-details-box">
                    <h5>Official Bank Account Details:</h5>
                    <p><strong>Bank:</strong> {bankDetails.bankName}</p>
                    <p><strong>Account Number:</strong> {bankDetails.accountNumber}</p>
                    <p><strong>IFSC Code:</strong> {bankDetails.ifscCode}</p>
                  </div>
                )}

                {paymentMode === 'CASH' && (
                  <div className="mode-details-box">
                    <p>
                      ℹ️ For cash payment, an invoice request will be raised. Please visit your nearest
                      branch to deposit the cash. Branch staff will verify and activate your package immediately.
                    </p>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label>Transaction / UTR Reference (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter UTR, Cheque number or reference note"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-submit-upgrade"
                >
                  {submitting ? 'Generating Invoice...' : 'Proceed with Upgrade'}
                </button>
              </form>
            ) : (
              /* Success / Pending Receipt */
              <div className="invoice-success-box">
                <span className="success-icon">🧾</span>
                <h3>Invoice Request Created</h3>
                <p className="invoice-num">Invoice Number: <strong>{invoiceResult.invoice?.invoiceNumber}</strong></p>
                <p className="invoice-msg">{invoiceResult.message}</p>
                <div className="invoice-summary-card">
                  <div><span>Package:</span> <strong>{invoiceResult.invoice?.package?.name}</strong></div>
                  <div><span>Amount:</span> <strong>₹{invoiceResult.invoice?.amount}</strong></div>
                  <div><span>Payment Mode:</span> <strong>{invoiceResult.invoice?.paymentMode}</strong></div>
                  <div><span>Status:</span> <span className="status-badge-pending">PENDING VERIFICATION</span></div>
                </div>
                <button
                  onClick={() => setSelectedPkg(null)}
                  className="btn-done-invoice"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
