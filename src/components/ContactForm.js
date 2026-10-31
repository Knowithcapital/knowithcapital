"use client";

import { useState } from 'react';
import styles from './ContactForm.module.css';

const REASONS = [
  { value: 'Portfolio review', label: 'Portfolio review' },
  { value: 'General inquiry', label: 'General inquiry' },
  { value: 'General assistance', label: 'General assistance' },
];

/**
 * Consultation request form shared by the home and contact pages.
 * Submissions go to Web3Forms (NEXT_PUBLIC_WEB3FORMS_KEY) and end up in the inbox it is registered to.
 * `formClassName` / `inputClassName` come from the page so the form matches its section.
 */
export default function ContactForm({ formClassName, inputClassName }) {
  const [reason, setReason] = useState('');
  const [result, setResult] = useState({ text: '', ok: true });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setResult({ text: 'Please choose a reason for your request.', ok: false });
      return;
    }
    setSending(true);
    setResult({ text: 'Sending…', ok: true });

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append('access_key', process.env.NEXT_PUBLIC_WEB3FORMS_KEY || '');
    formData.append('reason', reason);
    formData.append('subject', `New ${reason.toLowerCase()} request — Knowith Capital`);
    formData.append('from_name', 'Knowith Capital Contact Form');

    try {
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setResult({ text: 'Thank you for reaching out. A Knowith Capital wealth manager will contact you shortly.', ok: true });
        form.reset();
        setReason('');
      } else {
        console.error('Contact form error', data);
        setResult({ text: data.message || 'Submission failed. Please try again.', ok: false });
      }
    } catch {
      setResult({ text: 'Something went wrong. Please try again later.', ok: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <form className={formClassName} onSubmit={handleSubmit}>
      <div className={styles.reasonLabel} id="reason-label">What can we help you with?</div>
      <div className={styles.reasonGroup} role="radiogroup" aria-labelledby="reason-label">
        {REASONS.map(r => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={reason === r.value}
            className={`${styles.reasonBtn} ${reason === r.value ? styles.reasonBtnActive : ''}`}
            onClick={() => setReason(r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {reason === 'Portfolio review' && (
        <p className={styles.reasonHint}>
          For a portfolio review we will need your fund names, ISINs and the number of units you hold. After you send this form we will email you exactly what to share.
        </p>
      )}

      <input type="text" name="name" placeholder="Full Name" className={inputClassName} required autoComplete="name" />
      <input type="email" name="email" placeholder="Email Address" className={inputClassName} required autoComplete="email" />
      <input type="tel" name="phone" placeholder="Phone Number" className={inputClassName} autoComplete="tel" />
      <input type="text" name="message" placeholder="Message / Details" className={inputClassName} />
      <button type="submit" className="btn btn-gold" style={{ marginTop: '24px' }} disabled={sending}>
        {sending ? 'Sending…' : 'Send Message'}
      </button>

      {result.text && (
        <p role="status" style={{ marginTop: '16px', fontSize: '0.9rem', color: result.ok ? '#7bd88f' : '#ff8a8a' }}>
          {result.text}
        </p>
      )}
    </form>
  );
}
