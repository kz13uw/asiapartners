import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguageStore } from '../store/useLanguageStore';

const languages = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

const LanguageSelector = () => {
  const { lang, setLanguage } = useLanguageStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--pk-bg-surface)', padding: '0.25rem 0.6rem', borderRadius: '8px', border: '1px solid var(--pk-border)' }}>
      <Globe size={16} color="var(--pk-primary)" />
      <select 
        value={lang} 
        onChange={(e) => setLanguage(e.target.value)}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--pk-text-main)', 
          fontWeight: 600, 
          fontSize: '0.85rem',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.flag} {item.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
