import React, { useState } from 'react';
import { useTranslation } from '../store/useLanguageStore';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfUse from './TermsOfUse';
import { ShieldCheck, BookOpen, FileText, CheckCircle } from 'lucide-react';

const DocumentsPage = () => {
  const { lang, t } = useTranslation();
  const [activeDoc, setActiveDoc] = useState('privacy'); // 'privacy' or 'terms'

  const docList = [
    {
      id: 'privacy',
      titleKey: 'tab_privacy',
      icon: ShieldCheck,
      color: '#2B8AC4',
      badge: 'PDF / HTML'
    },
    {
      id: 'terms',
      titleKey: 'tab_terms',
      icon: BookOpen,
      color: '#16a34a',
      badge: 'PDF / HTML'
    }
  ];

  return (
    <div className="fade-in" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '4rem' }}>
      
      {/* Sub-Header / Hero */}
      <div style={{ backgroundColor: '#163A54', color: 'white', padding: '3.5rem 2rem 2.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.4rem 1rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
            <FileText size={16} />
            {t('nav_documents')} Asia Partners
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            {t('documents_title')}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0, maxWidth: '700px', marginInline: 'auto' }}>
            Правовые регламенты и регламентирующие документы группы компаний «Asia Partners»
          </p>
        </div>
      </div>

      {/* Document Icon Cards Selector */}
      <div style={{ maxWidth: '1000px', margin: '-2rem auto 2rem', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {docList.map((doc) => {
            const IconComponent = doc.icon;
            const isActive = activeDoc === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '14px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  cursor: 'pointer',
                  border: isActive ? `2px solid ${doc.color}` : '2px solid transparent',
                  boxShadow: isActive ? '0 10px 25px -5px rgba(0,0,0,0.1)' : '0 4px 15px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s ease',
                  transform: isActive ? 'translateY(-2px)' : 'none'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: isActive ? `${doc.color}15` : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComponent size={24} color={isActive ? doc.color : '#64748b'} />
                </div>

                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 700, color: isActive ? '#0f172a' : '#475569' }}>
                    {t(doc.titleKey)}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    {isActive ? (
                      <span style={{ color: doc.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={14} /> Открыт в текущем окне
                      </span>
                    ) : (
                      <span>Нажмите для открытия</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Render */}
      <div>
        {activeDoc === 'privacy' && <PrivacyPolicy />}
        {activeDoc === 'terms' && <TermsOfUse />}
      </div>
    </div>
  );
};

export default DocumentsPage;
