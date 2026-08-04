import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../store/useLanguageStore';
import { tendersAPI } from '../api';

const IndexPage = () => {
  const { lang, t } = useTranslation();
  const [activeTendersCount, setActiveTendersCount] = useState(3);

  useEffect(() => {
    const fetchTenderCount = async () => {
      try {
        const res = await tendersAPI.list({ status: 'published' });
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (items.length > 0) {
          setActiveTendersCount(items.length);
        }
      } catch (e) {
        setActiveTendersCount(3);
      }
    };
    fetchTenderCount();
  }, []);

  return (
    <div className="fade-in" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Hero Section */}
      <section style={{ position: 'relative', padding: '4rem 2rem 3.5rem', zIndex: 10, overflow: 'hidden' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
          
          <h1 style={{ fontSize: '2.5rem', lineHeight: 1.25, fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a', letterSpacing: '-0.5px' }}>
            {t('hero_title1')} <br />
            <span style={{ background: 'linear-gradient(135deg, #2B8AC4 0%, #1e40af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('hero_title2')}
            </span>
          </h1>
          
          <p style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#475569', marginBottom: '2.25rem', maxWidth: '680px', marginInline: 'auto' }}>
            {t('hero_desc')}
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem', borderRadius: '10px', display: 'inline-flex', gap: '0.5rem', boxShadow: '0 8px 20px -4px rgba(43,138,196,0.35)' }}>
              {t('btn_submit')} <ArrowRight size={18} />
            </Link>
            <Link to="/public-tenders" className="btn btn-outline" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem', borderRadius: '10px', background: '#ffffff' }}>
              {t('btn_registry')}
            </Link>
          </div>
          
          {/* Live Metrics */}
          <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(226, 232, 240, 0.8)', maxWidth: '800px', marginInline: 'auto' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2B8AC4', letterSpacing: '-0.5px' }}>{activeTendersCount}</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{t('metric_active_tenders')}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFAF00', letterSpacing: '-0.5px' }}>100%</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{t('metric_eds_guarantee')}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>0.0 ₸</div>
              <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{t('metric_no_commission')}</div>
            </div>
          </div>

        </div>
      </section>

      {/* 3-Step Process */}
      <section style={{ padding: '4rem 2rem 5rem', backgroundColor: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.25rem', marginBottom: '3rem', color: '#0f172a' }}>{t('how_it_works_title')}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            
            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid var(--pk-border)', boxShadow: 'var(--pk-shadow-sm)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--pk-primary)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.25rem' }}>1</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{t('step1_title')}</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{t('step1_desc')}</p>
            </div>

            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid var(--pk-border)', boxShadow: 'var(--pk-shadow-sm)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--pk-primary)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.25rem' }}>2</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{t('step2_title')}</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{t('step2_desc')}</p>
            </div>

            <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '16px', border: '1px solid var(--pk-border)', boxShadow: 'var(--pk-shadow-sm)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--pk-primary)', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.25rem' }}>3</div>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{t('step3_title')}</h4>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>{t('step3_desc')}</p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default IndexPage;
