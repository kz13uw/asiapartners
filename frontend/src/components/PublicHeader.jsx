import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';

const PublicHeader = () => {
  const location = useLocation();

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
          <Link to="/" style={navItemStyle('/')} className="hover:text-white">Главная</Link>
          <Link to="/faq" style={navItemStyle('/faq')} className="hover:text-white">Инструкции</Link>
          <Link to="/public-tenders" style={navItemStyle('/public-tenders')} className="hover:text-white">Закупки</Link>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 500, padding: '0.3rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Globe size={16} />
            <select style={{ background: 'transparent', color: 'white', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, padding: 0 }}>
              <option value="ru" style={{ color: 'black' }}>RU</option>
              <option value="kz" style={{ color: 'black' }}>KZ</option>
              <option value="en" style={{ color: 'black' }}>EN</option>
            </select>
          </div>
          <Link to="/login" className="btn" style={{ borderRadius: '99px', padding: '0.5rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'white', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', textDecoration: 'none' }}>
            Вход для Поставщиков
          </Link>
        </div>

      </div>
    </header>
  );
};

export default PublicHeader;
