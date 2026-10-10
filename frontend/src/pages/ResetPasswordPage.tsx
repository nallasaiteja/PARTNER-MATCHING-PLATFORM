import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authApi';
import './MemberProfileFormPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!token) {
      setError('The reset link is invalid or expired.');
      return;
    }
    if (password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message || 'Password has been reset.');
      setPassword('');
      setConfirmation('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="profile-form-page-container">
      <section className="step-card-panel" style={{ maxWidth: '520px', margin: '48px auto' }}>
        <h1 className="step-panel-title">Reset Password</h1>
        <form onSubmit={submit}>
          <div className="form-field-group">
            <label className="form-label" htmlFor="reset-password">New password</label>
            <input id="reset-password" className="form-input" type="password" autoComplete="new-password"
              minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <div className="form-field-group">
            <label className="form-label" htmlFor="reset-password-confirm">Confirm password</label>
            <input id="reset-password-confirm" className="form-input" type="password" autoComplete="new-password"
              minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          </div>
          {error && <p className="form-error-msg">{error}</p>}
          {message && <p className="form-helper-text">{message}</p>}
          <button className="btn-nav btn-nav-next" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Set new password'}
          </button>
        </form>
        <p style={{ marginTop: '16px' }}><Link to="/">Return to the app</Link></p>
      </section>
    </main>
  );
}