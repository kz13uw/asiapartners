import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { tendersAPI } from '../../api';
import { useTranslation } from '../../store/useLanguageStore';
import { useAuthStore } from '../../store/authStore';
import TenderRegistryTable from '../../components/TenderRegistryTable';

const TenderSearch = () => {
  const { lang, t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  const isSupplierUser = user?.role === 'supplier' || location.pathname.startsWith('/supplier/');
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tendersAPI.list();
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setTenders(items);
      } catch (error) {
        console.warn("API fetch notice for tender search:", error);
        setTenders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTenders();
  }, []);

  const filteredTenders = tenders.filter(tender => {
    const term = (searchTerm || '').trim().toLowerCase();
    const title = (tender.title || '').toLowerCase();
    const number = (tender.number || '').toLowerCase();
    const org = (tender.organizer_name || '').toLowerCase();
    const matchesSearch = !term || title.includes(term) || number.includes(term) || org.includes(term);
    const matchesMethod = methodFilter === 'all' || tender.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--pk-primary)' }}>
          {t('tender_registry') || 'Реестр открытых тендеров'}
        </h1>
        <p className="text-sec" style={{ fontSize: '0.9rem', margin: 0 }}>
          {t('tender_registry_sub') || 'Единый реестр закупочных процедур холдинга Asia Partners'}
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
              placeholder={t('search_placeholder') || "Поиск по названию или заказчику..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ minWidth: '240px' }}>
            <select 
              className="form-control" 
              value={methodFilter} 
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">{t('filter_method_all') || 'Все способы закупки'}</option>
              <option value="zcp">{t('method_zcp') || 'Запрос ценовых предложений (ЗЦП)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Реестр закупок списком (Официальная Таблица Goszakup Стандарт) */}
      <TenderRegistryTable 
        tenders={filteredTenders}
        loading={loading}
        userRole={isSupplierUser ? 'supplier' : 'public'}
        emptyText="Опубликованные закупки отсутствуют"
      />
    </div>
  );
};

export default TenderSearch;
