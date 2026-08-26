import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { tendersAPI } from '../api';
import { useTranslation } from '../store/useLanguageStore';
import TenderRegistryTable from '../components/TenderRegistryTable';

const PublicTenders = () => {
  const { lang, t } = useTranslation();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tendersAPI.list();
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setTenders(items);
      } catch (err) {
        console.warn('API fetch notice:', err);
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTenders();
  }, []);


  const filteredTenders = tenders.filter(tender => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return true;
    const title = (tender.title || '').toLowerCase();
    const orgName = (tender.organizer_name || '').toLowerCase();
    const compName = (tender.company_name || '').toLowerCase();
    const num = (tender.number || '').toLowerCase();
    return title.includes(term) || orgName.includes(term) || compName.includes(term) || num.includes(term);
  });


  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--pk-primary)' }}>
          Реестр тендеров и закупок «Asia Partners»
        </h1>
        <p className="text-sec" style={{ fontSize: '0.9rem', margin: 0 }}>
          Официальный единый реестр опубликования электронных закупок и закупаемых лотов
        </p>
      </div>

      {/* Фильтры и Поиск */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder={t('search_placeholder') || 'Поиск по наименованию лота, номеру или заказчику...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Реестр закупок списком (Официальная Таблица Goszakup Стандарт) */}
      <TenderRegistryTable 
        tenders={filteredTenders}
        loading={loading}
        userRole="public"
        emptyText="Опубликованные закупки отсутствуют"
      />
    </div>
  );
};

export default PublicTenders;
