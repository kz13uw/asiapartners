import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Building2, Clock, Users, ArrowRight, Eye, ShieldCheck, Package } from 'lucide-react';
import { tendersAPI } from '../../api';
import { useTranslation } from '../../store/useLanguageStore';

const TenderSearch = () => {
  const { lang, t } = useTranslation();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const filteredTenders = tenders.filter(tender => {
    const matchesSearch = tender.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tender.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tender.organizer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || tender.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--pk-primary)' }}>
          {t('tender_registry')}
        </h1>
        <p className="text-sec">
          Единый реестр закупочных процедур холдинга Asia Partners
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
          
          <div style={{ minWidth: '220px' }}>
            <select 
              className="form-control" 
              value={methodFilter} 
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">{t('filter_method_all')}</option>
              <option value="zcp">{t('method_zcp')}</option>
              <option value="one_stage">{t('method_one_stage')}</option>
              <option value="auction">{t('method_auction')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица / Список тендеров */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-sec">Загрузка реестра тендеров...</p>
        </div>
      ) : filteredTenders.length > 0 ? (
        <div className="table-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Номер и наименование лота</th>
                <th>Организатор / Сфера</th>
                <th>Способ закупки</th>
                <th>Плановая сумма</th>
                <th>Место поставки</th>
                <th>Статус</th>
                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.map((tnd) => (
                <tr key={tnd.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                  <td style={{ padding: '1rem', maxWidth: '300px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pk-primary)', marginBottom: '0.2rem' }}>
                      {tnd.number || `TND-${tnd.id}`}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.3 }}>
                      {tnd.title}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tnd.organizer_name || 'ТОО "Asia Partners"'}</div>
                    <div className="text-sm text-sec">{tnd.category_name || 'Закупки холдинга'}</div>
                  </td>
                  <td>
                    <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
                      {tnd.method === 'zcp' ? 'Запрос цен' : (tnd.method === 'auction' ? 'Аукцион' : 'Открытый тендер')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--pk-primary)' }}>
                    {formatCurrency(tnd.start_price || tnd.budget)}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#475569', maxWidth: '180px' }}>
                    {tnd.delivery_place || 'Не указано'}
                  </td>
                  <td>
                    {tnd.status === 'published' || tnd.status === 'accepting' ? (
                      <span className="badge badge-success">Прием заявок</span>
                    ) : tnd.status === 'evaluation' ? (
                      <span className="badge badge-warning">Рассмотрение</span>
                    ) : (
                      <span className="badge">{tnd.status}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                    <Link to={`/tenders/${tnd.id}`} className="btn btn-primary btn-sm">
                      <Eye size={14} /> Просмотр
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
          <h3>Реестр тендеров пуст</h3>
          <p className="text-sec" style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            Зарегистрированные тендеры отсутствуют. Когда Организатор создаст и опубликует первый лот, он отобразится в этом списке.
          </p>
        </div>
      )}
    </div>
  );
};

export default TenderSearch;
