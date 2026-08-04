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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Asia Partners" style={{ height: '50px', transform: 'scale(3.5)', transformOrigin: 'left center', filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link to="/" style={navItemStyle('/')} className="hover:text-white">{t('home')}</Link>
          <Link to="/faq" style={navItemStyle('/faq')} className="hover:text-white">{t('faq')}</Link>
          <Link to="/public-tenders" style={navItemStyle('/public-tenders')} className="hover:text-white">{t('tenders')}</Link>
          <Link to="/documents" style={navItemStyle('/documents')} className="hover:text-white">{t('nav_documents')}</Link>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <LanguageSelector />
          <Link to="/login" className="btn" style={{ borderRadius: '99px', padding: '0.5rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'white', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', textDecoration: 'none' }}>
            {t('login')}
          </Link>
        </div>

      </div>
    </header>
  );
};

export default PublicHeader;
