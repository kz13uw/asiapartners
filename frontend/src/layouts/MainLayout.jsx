import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Building2, Settings, Scale, ShieldCheck, LogOut, History, UserSquare2, FileSignature, FileText, Menu, X, Users, Lock, Activity } from 'lucide-react';

import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from '../store/useLanguageStore';

const MainLayout = () => {
  const { lang, t } = useTranslation();
  const { user, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = () => {
    try {
      const stored = localStorage.getItem(`notifications_${user?.id || 'guest'}`);
      if (stored) {
        const notifs = JSON.parse(stored);
        if (Array.isArray(notifs)) {
          setUnreadCount(notifs.filter(n => !n.read).length);
          return;
        }
      }
      setUnreadCount(2);
    } catch (e) {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    updateUnreadCount();
    const interval = setInterval(updateUnreadCount, 2000);
    window.addEventListener('storage', updateUnreadCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateUnreadCount);
    };
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getMenuByRole = () => {
    if (!user) return [];
    
    if (user.role === 'supplier') {
      return [
        { path: '/supplier/dashboard', icon: Building2, label: t('dashboard_supplier') },
        { path: '/tenders', icon: Scale, label: t('nav_tenders') },
        { path: '/supplier/history', icon: History, label: t('history') },
        { path: '/supplier/profile', icon: UserSquare2, label: t('nav_profile') },
      ];
    }
    
    if (user.role === 'organizer') {
      return [
        { path: '/organizer/dashboard', icon: Settings, label: t('dashboard_organizer') },
        { path: '/organizer/tenders/create', icon: Scale, label: t('nav_create_tender') },
        { path: '/organizer/tenders/drafts', icon: FileText, label: t('nav_draft_tenders') || 'Черновики тендеров' },
        { path: '/tenders', icon: Scale, label: t('nav_tenders') },
      ];
    }
    
    if (user.role === 'monitoring') {
      return [
        { path: '/monitoring/dashboard', icon: Activity, label: t('dashboard_monitoring') },
        { path: '/tenders', icon: Scale, label: t('nav_tenders') },
        { path: '/reports', icon: FileText, label: t('nav_reports') },
      ];
    }
    
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', icon: Users, label: t('dashboard_admin') },
        { path: '/monitoring/dashboard', icon: Activity, label: t('dashboard_monitoring') },
        { path: '/tenders', icon: Scale, label: t('nav_tenders') },
        { path: '/reports', icon: FileText, label: t('nav_reports') },
      ];
    }
    return [];
  };

  const menu = getMenuByRole();

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 990, backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`sidebar glass-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        style={{ 
          width: '260px', 
          minWidth: '260px',
          flexShrink: 0,
          display: 'flex', 
          flexDirection: 'column',
          height: '100vh',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          boxShadow: isMobileMenuOpen ? '4px 0 24px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        <div className="sidebar-logo" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.95)', minHeight: '72px' }}>
          <img src="/logo.png" alt="Asia Partners" style={{ height: '100px', margin: '-10px 0', transform: 'scale(2.5)', pointerEvents: 'none' }} />
        </div>
        <nav className="sidebar-nav" style={{ padding: '1.5rem 0', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', 
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', textDecoration: 'none',
                  backgroundColor: isActive ? 'var(--pk-primary)' : 'transparent',
                  borderLeft: `4px solid ${isActive ? 'var(--pk-accent)' : 'transparent'}`,
                  fontWeight: 500,
                  fontSize: '0.92rem',
                  letterSpacing: '0.01em',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={19} color={isActive ? '#fff' : 'rgba(255,255,255,0.7)'} /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '1rem' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', color: '#ff8389', cursor: 'pointer', textAlign: 'left', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
            <LogOut size={19} /> {t('logout')}
          </button>
        </div>
      </aside>

      <main className="main-wrapper" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'transparent', height: '100vh', overflow: 'hidden' }}>
        <header className="top-header glass-header" style={{ height: '72px', minHeight: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', position: 'relative', zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Hamburger Button for Mobile/Tablet */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', color: 'var(--pk-text-main)', display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h3 className="text-sec hidden-mobile" style={{ fontWeight: 600, margin: 0, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>{t('portal_title')}</h3>
          </div>
          <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }} ref={menuRef}>
            <LanguageSelector />
            <div className="hidden-mobile" style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--pk-text-main)' }}>{user?.full_name}</div>
            </div>
            
            <div 
              className="avatar" 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--pk-primary-bg)', color: 'var(--pk-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, border: '1px solid var(--pk-primary-light)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {user?.full_name?.substring(0, 2).toUpperCase() || 'US'}
            </div>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="profile-dropdown" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                backgroundColor: 'var(--pk-bg-surface)', border: '1px solid var(--pk-border)',
                borderRadius: '12px', boxShadow: 'var(--pk-shadow-md)', width: '220px',
                zIndex: 100, overflow: 'hidden', animation: 'fadeIn 0.2s ease'
              }}>
                <div style={{ padding: '0.5rem 0' }}>
                  <Link to="/profile/settings" onClick={() => setIsProfileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', color: 'var(--pk-text-main)', textDecoration: 'none', transition: 'background 0.2s' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--pk-bg-main)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <Settings size={18} color="var(--pk-text-secondary)" /> Настройки
                  </Link>
                  <Link to="/profile/notifications" onClick={() => setIsProfileMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', color: 'var(--pk-text-main)', textDecoration: 'none', transition: 'background 0.2s', justifyContent: 'space-between' }} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--pk-bg-main)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Activity size={18} color="var(--pk-text-secondary)" /> {t('notifications_title') || 'Уведомления'}
                    </div>
                    {unreadCount > 0 && (
                      <span className="badge badge-primary" style={{ padding: '0.15rem 0.45rem', fontSize: '0.75rem', borderRadius: '10px' }}>{unreadCount}</span>
                    )}
                  </Link>
                  <div style={{ height: '1px', backgroundColor: 'var(--pk-border)', margin: '0.5rem 0' }}></div>
                  <button 
                    onClick={() => { setIsProfileMenuOpen(false); logout(); }} 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', color: 'var(--pk-danger)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s', fontSize: '1rem' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fee2e2'} onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={18} /> Выйти
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="content-area" style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default MainLayout;
