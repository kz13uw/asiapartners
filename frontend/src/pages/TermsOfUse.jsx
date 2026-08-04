import React from 'react';
import { useTranslation } from '../store/useLanguageStore';

const TermsOfUse = () => {
  const { lang, t } = useTranslation();

  return (
    <div className="fade-in" style={{ padding: '4rem 2rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--pk-text-main)' }}>
          {t('terms_title')}
        </h1>
        
        <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#475569' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            {t('terms_intro')}
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pk-text-main)', marginTop: '2.5rem', marginBottom: '1rem' }}>
            {t('terms_sec1_title')}
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            {t('terms_sec1_desc')}
          </p>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--pk-text-main)', marginTop: '2.5rem', marginBottom: '1rem' }}>
            {t('terms_sec2_title')}
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            {t('terms_sec2_desc')}
          </p>

          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#64748b' }}>
            <p>© 2026 Asia Partners. {t('footer_rights')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
