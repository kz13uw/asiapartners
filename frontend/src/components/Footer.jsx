import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useTranslation } from '../store/useLanguageStore';

const Footer = () => {
  const { lang, t } = useTranslation();

  return (
    <footer style={{ backgroundColor: '#091C27', color: 'white', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4rem' }}>
          
          {/* Column 1: About & Social */}
          <div style={{ maxWidth: '450px' }}>
            <img src="/logo.png" alt="Asia Partners" style={{ height: '190px', marginTop: '-2.5rem', marginBottom: '-2.5rem', filter: 'brightness(0) invert(1)' }} />
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {t('footer_about_text')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a href="#" style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'background 0.3s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="#" style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'background 0.3s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="#" style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'background 0.3s' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Contacts */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'white' }}>{t('footer_contacts_title')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(43,138,196,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={20} color="var(--pk-primary)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{t('footer_address_label')}</p>
                  <span style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{t('footer_address_val')}</span>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(43,138,196,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={20} color="var(--pk-primary)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{t('footer_phone_label')}</p>
                  <a href="tel:+77222525252" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }}>+7 (7222) 52-52-52</a>
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(43,138,196,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={20} color="var(--pk-primary)" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>Email</p>
                  <a href="mailto:info@asiapartners.kz" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.9rem' }}>info@asiapartners.kz</a>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      <div style={{ borderTop: '1px solid #1f2937' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>{t('footer_rights')}</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/privacy" style={{ color: '#6b7280', fontSize: '0.85rem', textDecoration: 'none' }}>{t('footer_privacy')}</Link>
            <Link to="/terms" style={{ color: '#6b7280', fontSize: '0.85rem', textDecoration: 'none' }}>{t('footer_terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
