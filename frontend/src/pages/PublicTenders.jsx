import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Building2, Package, ArrowRight } from 'lucide-react';
import { tendersAPI } from '../api';
import { useTranslation } from '../store/useLanguageStore';

const PublicTenders = () => {
  const { lang, t } = useTranslation();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tendersAPI.list({ status: 'published' });
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const filteredTenders = tenders.filter(tender =>
    tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem', color: 'var(--pk-primary)' }}>
          Открытый реестр закупок «Asia Partners»
        </h1>
        <p className="text-sec" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem' }}>
          Официальный открытый реестр закупок компании Asia Partners.
        </p>
      </div>

      {/* Фильтры и Поиск */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Список тендеров */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-sec">Загрузка актуального реестра закупок...</p>
        </div>
      ) : filteredTenders.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredTenders.map((tender) => (
            <div key={tender.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className="badge badge-success">Опубликован</span>
                  <span className="text-sm text-sec" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> До {new Date(tender.deadline_at || tender.end_date).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {tender.title}
                </h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <Building2 size={16} />
                  <span>{tender.company_name || tender.organizer_name || 'ТОО "Asia Partners"'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--pk-border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="text-sm text-sec">{t('start_price')}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--pk-primary)' }}>
                    {formatCurrency(tender.start_price || tender.budget)}
                  </div>
                </div>
                <Link to={`/tenders/${tender.id}`} className="btn btn-outline btn-sm">
                  {t('view_details')} <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Package size={48} color="var(--pk-text-secondary)" style={{ margin: '0 auto 1rem' }} />
          <h3>Активные тендеры отсутствуют</h3>
          <p className="text-sec" style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            В настоящее время опубликованные закупки отсутствуют. Новые лоты будут отображаться здесь по мере их публикации Организатором.
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicTenders;
