import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Zap, BarChart2, FileText,
  Clock, CheckCircle2, TrendingDown, Lock, Globe2,
  ChevronRight, Building2, Package, Briefcase, Users,
  ClipboardList, BadgeCheck, PhoneCall, Mail, MapPin,
  Award, Layers
} from 'lucide-react';
import { useTranslation } from '../store/useLanguageStore';
import { tendersAPI } from '../api';

/* ─── animated counter hook ─── */
function useCounter(target, duration = 1400, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start || !target) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

/* ─── intersection observer hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─── Tender Card ─── */
const TenderCard = ({ tender }) => {
  const methods = { ZCP: 'ЗЦП', RFQ: 'ЗКП', AUCTION: 'Аукцион', TENDER: 'Тендер' };
  const types = { goods: 'Товар', services: 'Услуги', works: 'Работы', GOODS: 'Товар', SERVICES_WORKS: 'Услуги / Работы' };
  const deadline = tender.deadline_at
    ? new Date(tender.deadline_at).toLocaleDateString('ru-KZ', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={`/tenders/${tender.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block', textDecoration: 'none',
        background: hovered ? '#ffffff' : 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(12px)',
        border: hovered ? '1.5px solid rgba(43,138,196,0.35)' : '1.5px solid rgba(226,232,240,0.8)',
        borderRadius: '16px', padding: '1.25rem 1.4rem',
        transition: 'all 0.22s ease',
        boxShadow: hovered ? '0 10px 32px rgba(43,138,196,0.12)' : '0 2px 10px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.85rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {tender.title}
          </p>
          <p style={{ margin: 0, fontSize: '0.73rem', color: '#94a3b8', fontWeight: 500 }}>{tender.number}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
          <span style={{ background: 'linear-gradient(135deg,#163A54,#1e40af)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
            {methods[tender.method] || tender.method}
          </span>
          {tender.subject_type && (
            <span style={{ background: 'rgba(43,138,196,0.1)', color: '#2B8AC4', fontSize: '0.62rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: '5px' }}>
              {types[tender.subject_type] || tender.subject_type}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.78rem', margin: '0.5rem 0 0.75rem', fontWeight: 600 }}>
        <Building2 size={14} color="#2B8AC4" />
        <span>{tender.company_name || tender.organizer_name || 'ТОО "Asia Partners"'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(226,232,240,0.6)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#163A54' }}>
          {Number(tender.start_price || 0).toLocaleString('ru-KZ')} ₸
        </span>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
          <Clock size={12} /> до {deadline}
        </span>
      </div>
    </Link>
  );
};

/* ═══════════════════════════════════════════════════════════════ */
const IndexPage = () => {
  const { t } = useTranslation();
  const [tenders, setTenders] = useState([]);
  const [statsRef, statsInView] = useInView(0.25);

  const cnt1 = useCounter(12, 1200, statsInView); // subsidiaries
  const cnt2 = useCounter(tenders.length || 0, 1000, statsInView);
  const cnt3 = useCounter(500, 1600, statsInView); // annual procurements

  useEffect(() => {
    tendersAPI.list({ status: 'published' })
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setTenders(items.slice(0, 6));
      })
      .catch(() => setTenders([]));
  }, []);



  /* how to become supplier steps */
  const steps = [
    {
      num: '01', icon: <Users size={22} />, color: '#2B8AC4',
      title: 'Регистрация',
      desc: 'Создайте аккаунт поставщика, заполните профиль компании и загрузите ЭЦП. Быстрая верификация через НУЦ РК.',
    },
    {
      num: '02', icon: <ClipboardList size={22} />, color: '#059669',
      title: 'Выбор закупок',
      desc: 'Просматривайте реестр активных закупок группы Asia Partners и подавайте ценовые предложения онлайн.',
    },
    {
      num: '03', icon: <BadgeCheck size={22} />, color: '#7c3aed',
      title: 'Победа и контракт',
      desc: 'Лучшая цена — ваш контракт. Система автоматически определяет победителя и уведомляет стороны.',
    },
  ];

  /* supplier benefits */
  const benefits = [
    {
      icon: <ShieldCheck size={24} />, color: '#2B8AC4', bg: 'rgba(43,138,196,0.1)',
      title: 'Честная конкуренция',
      desc: 'Все закупки проводятся прозрачно и по единым правилам. Победитель определяется только ценой.',
    },
    {
      icon: <TrendingDown size={24} />, color: '#059669', bg: 'rgba(5,150,105,0.1)',
      title: 'Гарантия оплаты',
      desc: 'Группа Asia Partners — надёжный партнёр с многолетней историей. Полная оплата по условиям контракта.',
    },
    {
      icon: <Zap size={24} />, color: '#d97706', bg: 'rgba(217,119,6,0.1)',
      title: 'Быстрый процесс',
      desc: 'От подачи заявки до решения — минимум времени. Цифровой документооборот без бумаги.',
    },
    {
      icon: <Globe2 size={24} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',
      title: 'Доступ 24/7',
      desc: 'Подавайте предложения в любое время из любой точки Казахстана. Мобильная версия доступна.',
    },
    {
      icon: <BarChart2 size={24} />, color: '#0891b2', bg: 'rgba(8,145,178,0.1)',
      title: 'Аналитика тендеров',
      desc: 'Статистика по закупкам группы: объёмы, категории, лучшие поставщики, динамика цен — всё в одном дашборде.',
    },
    {
      icon: <Lock size={24} />, color: '#dc2626', bg: 'rgba(220,38,38,0.1)',
      title: 'Подпись через ЭЦП',
      desc: 'Юридически значимые документы подписываются квалифицированной ЭЦП НУЦ РК.',
    },
  ];

  return (
    <div className="fade-in" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{ position: 'relative', padding: 'clamp(3.5rem,7vw,6rem) 1.5rem clamp(3rem,5vw,5rem)', overflow: 'hidden', background: 'linear-gradient(135deg,#0a2133 0%,#163A54 55%,#0f2d45 100%)' }}>
        {/* Decorative blobs */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(43,138,196,0.18) 0%,transparent 65%)', animation: 'apFloat1 9s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,175,0,0.12) 0%,transparent 70%)', animation: 'apFloat2 12s ease-in-out infinite' }} />
          {/* grid lines */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div style={{ maxWidth: '960px', margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>


          <h1 style={{ fontSize: 'clamp(2rem,5vw,3.6rem)', lineHeight: 1.12, fontWeight: 900, marginBottom: '1.4rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Станьте поставщиком{' '}
            <span style={{ background: 'linear-gradient(135deg,#FFAF00 0%,#ffd15e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Asia Partners
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem,2vw,1.15rem)', lineHeight: 1.75, color: 'rgba(255,255,255,0.68)', marginBottom: '2.75rem', maxWidth: '640px', marginInline: 'auto' }}>
            Единая платформа для участия в закупках группы компаний <strong style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>Asia Partners</strong>. Подавайте ценовые предложения, подписывайте документы ЭЦП и получайте контракты — всё в одном месте.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: '#FFAF00', color: '#0f172a', fontWeight: 800, fontSize: '1rem',
              padding: '0.9rem 2.1rem', borderRadius: '12px', textDecoration: 'none',
              boxShadow: '0 12px 32px -4px rgba(255,175,0,0.4)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 40px -4px rgba(255,175,0,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 12px 32px -4px rgba(255,175,0,0.4)'; }}
            >
              Войти / Зарегистрироваться <ArrowRight size={18} />
            </Link>
            <Link to="/tenders" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.25)',
              color: '#ffffff', fontWeight: 600, fontSize: '1rem',
              padding: '0.9rem 2.1rem', borderRadius: '12px', textDecoration: 'none', transition: 'all 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Реестр закупок <ChevronRight size={18} />
            </Link>
          </div>

          {/* ── Animated Stats ── */}
          <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', maxWidth: '700px', marginInline: 'auto' }}>
            {[
              { val: cnt1, suffix: '', label: 'Компаний группы', sublabel: 'Asia Partners' },
              { val: cnt2, suffix: '', label: 'Активных закупок', sublabel: 'прямо сейчас' },
              { val: cnt3, suffix: '+', label: 'закупок ежегодно', sublabel: 'по всей группе' },
            ].map(({ val, suffix, label, sublabel }, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px',
                padding: '1.25rem 0.75rem',
              }}>
                <div style={{ fontSize: 'clamp(1.8rem,3.5vw,2.5rem)', fontWeight: 900, color: '#FFAF00', lineHeight: 1, letterSpacing: '-1px' }}>
                  {val}{suffix}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: '0.3rem' }}>{label}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ ACTIVE TENDERS ════════════════════ */}
      {tenders.length > 0 && (
        <section style={{ padding: 'clamp(2.5rem,5vw,4rem) 1.5rem', background: 'linear-gradient(180deg,#f0f7ff 0%,#f8fafc 100%)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem,2.5vw,1.75rem)', fontWeight: 900, color: '#0f172a' }}>
                  Активные закупки
                </h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  Открытые тендеры группы Asia Partners
                </p>
              </div>
              <Link to="/tenders" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#2B8AC4', color: '#fff', fontWeight: 600, fontSize: '0.88rem',
                padding: '0.6rem 1.4rem', borderRadius: '10px', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e6fa0'}
                onMouseLeave={e => e.currentTarget.style.background = '#2B8AC4'}
              >
                Все закупки <ChevronRight size={16} />
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '1rem' }}>
              {tenders.map(t => <TenderCard key={t.id} tender={t} />)}
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════ HOW TO BECOME SUPPLIER ════════════════════ */}
      <section style={{ padding: 'clamp(3.5rem,6vw,5.5rem) 1.5rem', background: 'linear-gradient(180deg,#f8fafc 0%,#eef4f9 100%)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>

            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 900, color: '#0f172a', marginBottom: '0.6rem' }}>
              Как стать поставщиком</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', marginInline: 'auto' }}>
              Простой и понятный процесс — от регистрации до победы в закупке
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.5rem' }}>
            {steps.map(({ num, icon, color, title, desc }, i) => (
              <div key={i} style={{
                position: 'relative', background: '#ffffff',
                border: `2px solid ${color}20`, borderRadius: '20px',
                padding: '2rem 1.6rem', textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.28s', overflow: 'hidden',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + '50'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = color + '20'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
              >
                <div style={{ position: 'absolute', top: '-4px', right: '14px', fontSize: '5.5rem', fontWeight: 900, color, opacity: 0.07, lineHeight: 1, userSelect: 'none', letterSpacing: '-4px' }}>{num}</div>
                <div style={{ width: '62px', height: '62px', borderRadius: '16px', background: `linear-gradient(135deg,${color}12,${color}28)`, border: `1.5px solid ${color}30`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.1rem' }}>
                  {icon}
                </div>
                <h4 style={{ margin: '0 0 0.65rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ BENEFITS ════════════════════ */}
      <section style={{ padding: 'clamp(3.5rem,6vw,5.5rem) 1.5rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 900, color: '#0f172a', marginBottom: '0.6rem' }}>
              Почему выбирают нашу платформу
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '520px', marginInline: 'auto' }}>
              Преимущества для поставщиков группы Asia Partners
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: '1.1rem' }}>
            {benefits.map(({ icon, color, bg, title, desc }, i) => (
              <div key={i} style={{
                background: '#f8fafc', border: '1.5px solid rgba(226,232,240,0.7)',
                borderRadius: '16px', padding: '1.6rem 1.4rem',
                transition: 'all 0.25s', cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = color + '35'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${color}12`; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(226,232,240,0.7)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  {icon}
                </div>
                <h3 style={{ margin: '0 0 0.45rem', fontSize: '0.975rem', fontWeight: 800, color: '#0f172a' }}>{title}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ CONTACTS CTA ════════════════════ */}
      <section style={{ padding: 'clamp(3.5rem,6vw,5rem) 1.5rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg,#0a2133 0%,#163A54 50%,#0f2d45 100%)',
            borderRadius: '24px', padding: 'clamp(2rem,5vw,3.5rem) clamp(1.5rem,4vw,3rem)',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 24px 60px -12px rgba(10,33,51,0.4)',
          }}>
            {/* decorative glows */}
            <div aria-hidden style={{ position: 'absolute', top: '-80px', right: '-60px', width: '280px', height: '280px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,175,0,0.15) 0%,transparent 65%)', pointerEvents: 'none' }} />
            <div aria-hidden style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(43,138,196,0.2) 0%,transparent 65%)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '2.5rem', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#ffffff', marginBottom: '0.85rem', lineHeight: 1.2 }}>
                  Готовы начать сотрудничество?
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.7 }}>
                  Зарегистрируйтесь на платформе и получите доступ к закупкам всех компаний группы Asia Partners бесплатно.
                </p>
                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <Link to="/login" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFAF00', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem',
                    padding: '0.8rem 1.75rem', borderRadius: '11px', textDecoration: 'none',
                    boxShadow: '0 8px 24px -4px rgba(255,175,0,0.4)', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    Зарегистрироваться <ArrowRight size={16} />
                  </Link>
                  <Link to="/faq" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.2)',
                    color: '#ffffff', fontWeight: 600, fontSize: '0.95rem',
                    padding: '0.8rem 1.75rem', borderRadius: '11px', textDecoration: 'none', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  >
                    Часто задаваемые вопросы
                  </Link>
                </div>
              </div>

              {/* Contact info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {[
                  { icon: <Globe2 size={16} />, label: 'Сайт группы', val: 'asiapartners.kz', href: 'https://asiapartners.kz' },
                  { icon: <Mail size={16} />, label: 'Эл. почта', val: 'info@asiapartners.kz', href: 'mailto:info@asiapartners.kz' },
                  { icon: <MapPin size={16} />, label: 'Офис', val: 'Казахстан, Семей', href: null },
                ].map(({ icon, label, val, href }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.85rem 1.1rem' }}>
                    <div style={{ color: '#FFAF00', flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600, textDecoration: 'none' }}>{val}</a>
                      ) : (
                        <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{val}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Keyframes */}
      <style>{`
        @keyframes apFloat1 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(25px,-30px) scale(1.06); }
          70% { transform: translate(-12px,18px) scale(0.97); }
        }
        @keyframes apFloat2 {
          0%,100% { transform: translate(0,0) scale(1); }
          55% { transform: translate(18px,-22px) scale(1.09); }
        }
        @keyframes apPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default IndexPage;
