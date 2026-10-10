import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/authApi';
import './MemberProfileFormPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="profile-form-page-container">
      <section className="step-card-panel" style={{ maxWidth: '520px', margin: '48px auto' }}>
        <h1 className="step-panel-title">Forgot Password</h1>
        <form onSubmit={submit}>
          <div className="form-field-group">
            <label className="form-label" htmlFor="forgot-password-email">Registered email</label>
            <input id="forgot-password-email" className="form-input" type="email" autoComplete="email"
              value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          {error && <p className="form-error-msg">{error}</p>}
          {message && <p className="form-helper-text">{message}</p>}
          <button className="btn-nav btn-nav-next" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Request reset link'}
          </button>
        </form>
        <p style={{ marginTop: '16px' }}><Link to="/">Return to the app</Link></p>
      </section>
    </main>
  );
}