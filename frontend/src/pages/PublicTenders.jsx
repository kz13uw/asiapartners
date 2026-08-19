import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, Building2, Package, ArrowRight, Eye } from 'lucide-react';
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
    tender.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tender.number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--pk-primary)' }}>
          Открытый реестр закупок «Asia Partners»
        </h1>
      </div>

      {/* Фильтры и Поиск */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder={t('search_placeholder') || 'Поиск по наименованию, номеру или заказчику...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Реестр закупок списком (Таблица) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-sec">Загрузка актуального реестра закупок...</p>
        </div>
      ) : filteredTenders.length > 0 ? (
        <div className="table-wrapper card" style={{ padding: 0, overflowX: 'auto', borderRadius: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--pk-border)', textAlign: 'left', fontSize: '0.85rem', color: '#475569' }}>
                <th style={{ padding: '1rem 1.25rem', width: '28%' }}>№ и наименование лота</th>
                <th style={{ padding: '1rem 1.25rem', width: '20%' }}>Организатор / Сфера</th>
                <th style={{ padding: '1rem 1.25rem', width: '15%' }}>Способ закупки</th>
                <th style={{ padding: '1rem 1.25rem', width: '13%' }}>Статус</th>
                <th style={{ padding: '1rem 1.25rem', width: '14%' }}>Начальная сумма</th>
                <th style={{ padding: '1rem 1.25rem', width: '10%', textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.map((tnd) => (
                <tr key={tnd.id} style={{ borderBottom: '1px solid var(--pk-border)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pk-primary)', marginBottom: '0.2rem', fontFamily: 'monospace' }}>
                      {tnd.number || `TND-${tnd.id}`}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.35 }}>
                      {tnd.title}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                      {tnd.company_name || tnd.organizer_name || 'ТОО "Asia Partners"'}
                    </div>
                    <div className="text-sm text-sec" style={{ fontSize: '0.78rem' }}>
                      {tnd.category_name || 'Закупки холдинга'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pk-primary)', borderColor: 'var(--pk-primary)' }}>
                      Запрос ценовых предложений
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span className="badge badge-success" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                      Прием заявок
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--pk-primary)', fontSize: '0.95rem' }}>
                    {formatCurrency(tnd.start_price || tnd.budget)}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <Link 
                      to={`/tenders/${tnd.id}`} 
                      className="btn btn-primary btn-sm"
                      style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                    >
                      Подробнее <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
