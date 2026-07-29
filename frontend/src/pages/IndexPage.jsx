import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, ArrowRight, Activity, Users, CheckCircle, Globe } from 'lucide-react';

const IndexPage = () => {
  return (
    <div className="fade-in" style={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column'
    }}>

      {/* Hero Section */}
      <main style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          
          {/* Left: Copy */}
          <div style={{ paddingRight: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--pk-primary)', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.8)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--pk-success)' }}></span> Система электронных закупок
            </div>
            
            <h1 style={{ fontSize: '3.5rem', lineHeight: 1.1, fontWeight: 800, marginBottom: '1.5rem', color: 'var(--pk-text-main)', letterSpacing: '-1px' }}>
              Тендерная площадка <br />
              <span style={{ color: 'var(--pk-primary)' }}>Asia Partners</span>
            </h1>
            
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: 'var(--pk-text-secondary)', marginBottom: '2.5rem', maxWidth: '500px' }}>
              Прозрачная, безопасная и эффективная платформа для проведения тендеров и взаимодействия с контрагентами группы компаний.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '12px', display: 'inline-flex', gap: '0.5rem' }}>
                Подать заявку на участие <ArrowRight size={20} />
              </Link>
            </div>
            
            <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--pk-primary)' }}>200+</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', fontWeight: 500 }}>Активных лотов</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--pk-accent)' }}>12</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', fontWeight: 500 }}>Компаний холдинга</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--pk-success)' }}>100%</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', fontWeight: 500 }}>Прозрачность</div>
              </div>
            </div>
          </div>

          {/* Right: Cards Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', justifyContent: 'center' }}>
            {/* Card 1: Supplier Login */}
            <div className="glass-panel" style={{ width: '100%', maxWidth: '340px', padding: '2rem', borderRadius: '24px', zIndex: 2, transform: 'rotate(2deg)', transition: 'transform 0.3s ease', alignSelf: 'flex-end', marginTop: '-2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--pk-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Users color="var(--pk-primary)" size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Для Поставщиков</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Участвуйте в закупках крупнейшего строительного холдинга региона.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <Link to="/login" className="btn btn-primary" style={{ width: '100%', borderRadius: '12px' }}>Войти</Link>
                <Link to="/register" className="btn btn-outline" style={{ width: '100%', borderRadius: '12px', background: 'white' }}>Регистрация</Link>
              </div>
            </div>

            {/* Card 2: Organizer Login */}
            <div className="glass-panel" style={{ width: '100%', maxWidth: '340px', padding: '2rem', borderRadius: '24px', zIndex: 1, transform: 'rotate(-3deg)', transition: 'transform 0.3s ease', alignSelf: 'flex-start', marginLeft: '-2rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 175, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <ShieldCheck color="var(--pk-accent)" size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Для Заказчиков</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Внутренний портал для управления тендерами и подведения итогов.
              </p>
              <Link to="/company" className="btn btn-outline" style={{ width: '100%', borderRadius: '12px', background: 'white' }}>Авторизация</Link>
            </div>
            
            {/* Card 3: Admin Login */}
            <div className="glass-panel" style={{ width: '100%', maxWidth: '280px', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 3, alignSelf: 'flex-end', marginRight: '-1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--pk-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck color="white" size={18} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Администрирование</div>
              </div>
              <Link to="/admin" className="btn btn-outline btn-sm" style={{ width: '100%', borderRadius: '8px', background: 'white', marginTop: '0.5rem' }}>Панель управления</Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default IndexPage;
