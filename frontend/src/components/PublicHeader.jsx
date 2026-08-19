import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';
import { useTranslation } from '../store/useLanguageStore';

const PublicHeader = () => {
  const location = useLocation();
  const { lang, t } = useTranslation();

  const navItemStyle = (path) => ({
    color: location.pathname === path ? 'white' : 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.95rem',
    transition: 'color 0.2s',
  });

  return (
    <header style={{ backgroundColor: '#163A54', position: 'relative', zIndex: 10, padding: '1rem 0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '1.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Asia Partners" style={{ height: '44px', transform: 'scale(2.6)', transformOrigin: 'left center', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={navItemStyle('/')} className="hover:text-white">{t('home')}</Link>
          <Link to="/faq" style={navItemStyle('/faq')} className="hover:text-white">{t('faq')}</Link>
          <Link to="/public-tenders" style={navItemStyle('/public-tenders')} className="hover:text-white">{t('tenders')}</Link>
          <Link to="/documents" style={navItemStyle('/documents')} className="hover:text-white">{t('nav_documents')}</Link>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <a 
            href="https://asiapartners.kz" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'rgba(255,255,255,0.9)', 
              textDecoration: 'none', 
              fontSize: '0.825rem', 
              fontWeight: 600,
              padding: '0.4rem 0.85rem',
              borderRadius: '99px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s ease'
            }}
          >
            🏢 asiapartners.kz ↗
          </a>
          <LanguageSelector />
          <Link to="/login" className="btn" style={{ borderRadius: '99px', padding: '0.45rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, color: 'white', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', textDecoration: 'none' }}>
            {t('login')}
          </Link>
        </div>

      </div>
    </header>
  );
};

export default PublicHeader;
