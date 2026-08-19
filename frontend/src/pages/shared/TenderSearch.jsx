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
          {t('tender_registry') || 'Реестр открытых тендеров'}
        </h1>
        <p className="text-sec">
          {t('tender_registry_sub') || 'Единый реестр закупочных процедур холдинга Asia Partners'}
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

      {/* Таблица / Список тендеров */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-sec">Загрузка реестра тендеров...</p>
        </div>
      ) : filteredTenders.length > 0 ? (
        <div className="table-wrapper card" style={{ padding: 0, overflowX: 'auto', borderRadius: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--pk-border)', textAlign: 'left', fontSize: '0.85rem', color: '#475569' }}>
                <th style={{ padding: '1rem 1.25rem', width: '26%' }}>{t('th_lot_num_title') || '№ и наименование лота'}</th>
                <th style={{ padding: '1rem 1.25rem', width: '18%' }}>{t('th_organizer_sector') || 'Организатор / Сфера'}</th>
                <th style={{ padding: '1rem 1.25rem', width: '15%' }}>{t('th_procurement_method') || 'Способ закупки'}</th>
                <th style={{ padding: '1rem 1.25rem', width: '14%' }}>Статус</th>
                <th style={{ padding: '1rem 1.25rem', width: '13%' }}>{t('th_budget_amount') || 'Плановая сумма'}</th>
                <th style={{ padding: '1rem 1.25rem', width: '14%' }}>{t('th_delivery_place') || 'Место поставки'}</th>
                <th style={{ padding: '1rem 1.25rem', width: '10%', textAlign: 'right' }}>{t('th_actions') || 'Действие'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenders.map((tnd) => (
                <tr key={tnd.id} style={{ borderBottom: '1px solid var(--pk-border)', verticalAlign: 'middle' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--pk-primary)', marginBottom: '0.2rem' }}>
                      {tnd.number || `TND-${tnd.id}`}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.35 }}>
                      {tnd.title}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>{tnd.organizer_name || 'ТОО "Asia Partners"'}</div>
                    <div className="text-sm text-sec" style={{ fontSize: '0.78rem' }}>{tnd.category_name || 'Закупки холдинга'}</div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pk-primary)', borderColor: 'var(--pk-primary)' }}>
                      {t('method_zcp') || 'Запрос ценовых предложений'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    {tnd.status === 'published' || tnd.status === 'accepting' ? (
                      <span className="badge badge-success" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                        Прием заявок
                      </span>
                    ) : tnd.status === 'evaluation' ? (
                      <span className="badge badge-warning" style={{ backgroundColor: '#d97706', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                        Рассмотрение
                      </span>
                    ) : tnd.status === 'completed' ? (
                      <span className="badge badge-primary" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                        Завершен
                      </span>
                    ) : tnd.status === 'cancelled' ? (
                      <span className="badge" style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.55rem' }}>
                        Отменен
                      </span>
                    ) : (
                      <span className="badge badge-outline" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        {tnd.status}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--pk-primary)', fontSize: '0.95rem' }}>
                    {formatCurrency(tnd.start_price || tnd.budget)}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                    {tnd.delivery_place || 'Не указано'}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                    <Link to={`/tenders/${tnd.id}`} className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <Eye size={14} /> {t('btn_view') || 'Просмотр'}
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
          <h3>{t('empty_tenders_title') || 'Реестр тендеров пуст'}</h3>
          <p className="text-sec" style={{ maxWidth: '480px', margin: '0.5rem auto 1.5rem' }}>
            {t('empty_tenders_desc') || 'Зарегистрированные тендеры отсутствуют. Когда Организатор создаст и опубликует первый лот, он отобразится в этом списке.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TenderSearch;
