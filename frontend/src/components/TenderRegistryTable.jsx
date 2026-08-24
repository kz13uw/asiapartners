import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, Eye, Edit3, Send, Copy, Ban, Trash2, ArrowRight } from 'lucide-react';
import { useTranslation } from '../store/useLanguageStore';

/**
 * Вспомогательная функция форматирования суммы в KZT (₸)
 * Формат: "3 204 310.35"
 */
export const formatPriceKzt = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  const num = Number(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Преобразование внутренних кодов способов закупки в официальные наименования
 */
export const getProcurementMethodName = (method) => {
  switch (method) {
    case 'open_tender':
    case 'tender':
      return 'Открытый тендер';
    case 'auction':
      return 'Аукцион';
    case 'single_source':
    case 'direct':
      return 'Из одного источника';
    case 'zcp':
    case 'request_quotes':
    default:
      return 'Запрос ценовых предложений';
  }
};

/**
 * Отображение бейджа статуса
 */
export const renderStatusBadge = (status) => {
  switch (status) {
    case 'published':
    case 'active':
      return (
        <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Опубликован
        </span>
      );
    case 'bidding':
    case 'open':
      return (
        <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Прием заявок
        </span>
      );
    case 'evaluation':
    case 'review':
      return (
        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Рассмотрение
        </span>
      );
    case 'completed':
    case 'finished':
    case 'closed':
      return (
        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Завершен
        </span>
      );
    case 'cancelled':
    case 'canceled':
      return (
        <span className="badge" style={{ backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Отменен
        </span>
      );
    case 'draft':
    default:
      return (
        <span className="badge" style={{ backgroundColor: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', display: 'inline-block' }}>
          Черновик
        </span>
      );
  }
};

/**
 * Единый компонент Реестра тендеров (ГОСЗАКУП / ASIA PARTNERS СТАНДАРТ)
 * Колонки: № лота | Наименование объявления | Наименование и описание лота | Кол-во | Сумма, тг. | Способ закупки | Статус
 */
const TenderRegistryTable = ({ 
  tenders = [], 
  loading = false, 
  userRole = 'public', // 'public', 'organizer', 'supplier', 'admin', 'draft'
  onDelete = null,
  onDuplicate = null,
  onCancel = null,
  onPublish = null,
  emptyText = 'Закупки не найдены'
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 0' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p className="text-sec" style={{ fontSize: '0.9rem' }}>Загрузка единого реестра закупок...</p>
      </div>
    );
  }

  if (!tenders || tenders.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '12px' }}>
        <Package size={44} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
        <h4 style={{ margin: '0 0 0.35rem 0', color: '#334155', fontSize: '1.1rem' }}>{emptyText}</h4>
        <p className="text-sec" style={{ maxWidth: '440px', margin: '0 auto', fontSize: '0.85rem' }}>
          В реестре пока нет записей, соответствующих выбранным критериям поиска или фильтрам.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrapper card" style={{ padding: 0, overflowX: 'auto', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem', tableLayout: 'auto' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
            <th style={{ padding: '0.85rem 1rem', width: '14%', whiteSpace: 'nowrap' }}>№ лота</th>
            <th style={{ padding: '0.85rem 1rem', width: '28%' }}>Наименование объявления</th>
            <th style={{ padding: '0.85rem 1rem', width: '24%' }}>Наименование и описание лота</th>
            <th style={{ padding: '0.85rem 1rem', width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>Кол-во</th>
            <th style={{ padding: '0.85rem 1rem', width: '13%', whiteSpace: 'nowrap' }}>Сумма, тг.</th>
            <th style={{ padding: '0.85rem 1rem', width: '14%' }}>Способ закупки</th>
            <th style={{ padding: '0.85rem 1rem', width: '10%', whiteSpace: 'nowrap' }}>Статус</th>
            {(onDelete || onDuplicate || onCancel || onPublish) && (
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Действия</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tenders.map((tnd) => {
            const detailUrl = tnd.status === 'draft' 
              ? `/organizer/tenders/${tnd.id}/edit` 
              : (userRole === 'supplier' ? `/supplier/tenders/${tnd.id}` : `/tenders/${tnd.id}`);
            const organizerName = tnd.company_name || tnd.organizer_name || 'КГУ "Общеобразовательная школа № 215" Управления образования города Алматы';
            const lotName = tnd.lot_name || tnd.title || 'Панель интерактивная';
            const lotDesc = tnd.category_name || (tnd.subject_type === 'goods' ? 'Товар / Оборудование' : 'Услуги / Работы');
            const quantity = tnd.quantity || 1;
            const totalPrice = tnd.start_price || tnd.budget || tnd.sum || 0;
            const methodText = getProcurementMethodName(tnd.procurement_method || tnd.method);

            return (
              <tr 
                key={tnd.id} 
                style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.15s ease' }}
                className="table-row-hover"
              >
                {/* 1. № лота */}
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'Consolas, Monaco, monospace', color: '#1e293b', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                  {tenderNumber}
                </td>

                {/* 2. Наименование объявления (Ссылка + Заказчик) */}
                <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                  <Link 
                    to={detailUrl} 
                    style={{ color: '#1d4ed8', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', lineHeight: 1.35, display: 'inline-block', marginBottom: '0.25rem' }}
                    title="Открыть подробные сведения об объявлении"
                  >
                    {tenderNumber} {tnd.title}
                  </Link>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.3 }}>
                    <strong>Заказчик:</strong> {organizerName}
                  </div>
                </td>

                {/* 3. Наименование и описание лота (БЕЗ СЛОВА "ИСТОРИЯ") */}
                <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.88rem', marginBottom: '0.2rem' }}>
                    {lotName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.3 }}>
                    {lotDesc}
                  </div>
                </td>

                {/* 4. Кол-во */}
                <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600, color: '#334155', verticalAlign: 'top' }}>
                  {quantity}
                </td>

                {/* 5. Сумма, тг. */}
                <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', fontSize: '0.92rem', verticalAlign: 'top' }}>
                  {formatPriceKzt(totalPrice)}
                </td>

                {/* 6. Способ закупки */}
                <td style={{ padding: '0.85rem 1rem', color: '#334155', fontSize: '0.82rem', lineHeight: 1.35, verticalAlign: 'top' }}>
                  {methodText}
                </td>

                {/* 7. Статус */}
                <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                  {renderStatusBadge(tnd.status)}
                </td>

                {/* 8. Опциональные действия (для кабинета организатора/черновиков) */}
                {(onDelete || onDuplicate || onCancel || onPublish) && (
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {tnd.status === 'draft' && onPublish && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: 700, borderRadius: '6px' }}
                          onClick={() => onPublish(tnd.id, tnd.title)}
                          title="Опубликовать данный черновик"
                        >
                          <Send size={13} style={{ marginRight: '0.25rem' }} /> Опубликовать
                        </button>
                      )}

                      {tnd.status === 'published' && onCancel && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => onCancel(tnd.id, tnd.title)}
                          title="Отменить закупку"
                        >
                          <Ban size={13} style={{ marginRight: '0.2rem' }} /> Отменить
                        </button>
                      )}

                      {onDuplicate && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                          onClick={() => onDuplicate(tnd.id, tnd.title)}
                          title="Создать копию тендера"
                        >
                          <Copy size={13} />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => onDelete(tnd.id, tnd.title)}
                          title="Удалить закупку"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TenderRegistryTable;
