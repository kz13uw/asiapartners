import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';

const languages = [
  { code: 'ru', label: 'RU', fullName: 'Русский' },
  { code: 'kz', label: 'KZ', fullName: 'Қазақша' },
  { code: 'en', label: 'EN', fullName: 'English' },
  { code: 'zh', label: 'CN', fullName: '中文' },
];

const LanguageSelector = () => {
  const { lang, setLanguage } = useLanguageStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.95)', padding: '0.35rem 0.65rem', borderRadius: '99px', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <Globe size={16} color="#163A54" />
      <select 
        value={lang} 
        onChange={(e) => setLanguage(e.target.value)}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: '#163A54', 
          fontWeight: 700, 
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none',
          paddingRight: '0.2rem'
        }}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code} style={{ color: '#0f172a', fontWeight: 600 }}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
