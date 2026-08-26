import React, { useState, useEffect } from 'react';
import { Search, Trophy, Layers, XCircle, FileText, CheckCircle2, AlertCircle, FileX, PackageOpen } from 'lucide-react';
import { tendersAPI } from '../../api';

const SupplierHistory = () => {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await tendersAPI.myBids();
        setBids(Array.isArray(res.data) ? res.data : (res.data?.items || []));
      } catch (err) {
        console.warn('Could not fetch bids history:', err);
        setBids([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Расчёт реальной статистики пользователя
  const wonCount = bids.filter(b => b.status === 'WINNER' || b.status === 'ACCEPTED' || b.result === 'winner').length;
  const totalCount = bids.length;
  const lostCount = bids.filter(b => b.status === 'REJECTED' || b.status === 'LOST' || b.result === 'rejected').length;

  const filteredBids = bids.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.tender_title || item.title || '').toLowerCase().includes(q) ||
      (item.tender_id || item.number || '').toString().toLowerCase().includes(q)
    );
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: 0 }}>История и итоги тендеров</h1>
      </div>

      <div className="history-stats" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-success)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-success)' }}>{wonCount}</div>
            <div className="h-stat-label" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginTop: '0.25rem' }}>Выигранных тендеров</div>
          </div>
          <Trophy size={48} color="#defbe6" />
        </div>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-primary)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-primary)' }}>{totalCount}</div>
            <div className="h-stat-label" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginTop: '0.25rem' }}>Всего заявок подано</div>
          </div>
          <Layers size={48} color="var(--pk-primary-light)" />
        </div>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-danger)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-danger)' }}>{lostCount}</div>
            <div className="h-stat-label" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginTop: '0.25rem' }}>Проигранных или не допущенных</div>
          </div>
          <XCircle size={48} color="#ffe5e5" />
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h3 className="mb-0" style={{ margin: 0 }}>Архив завершенных закупок</h3>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="Поиск в истории..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2rem', width: '250px' }} 
            />
          </div>
        </div>
        
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>№ Закупки</th>
                <th>Наименование тендера</th>
                <th>Итоговая сумма (тнг)</th>
                <th>Ваш результат</th>
                <th>Дата итогов</th>
                <th>Документы / Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--pk-text-secondary)' }}>
                    Загрузка истории заявок...
                  </td>
                </tr>
              ) : filteredBids.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
                    <PackageOpen size={40} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#64748b' }}>
                      У вас пока нет поданых заявок или завершённых закупок.
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Поданные вами заявки и результаты участия будут отображаться на этой странице.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBids.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{item.tender_id ? `Т-${item.tender_id}` : (item.number || 'Тендер')}</td>
                    <td>{item.tender_title || item.title || 'Тендерная закупка'}</td>
                    <td style={{ fontWeight: 600 }}>{Number(item.price_offer || item.amount || 0).toLocaleString('ru-RU')} ₸</td>
                    <td>
                      {(item.status === 'WINNER' || item.status === 'ACCEPTED' || item.result === 'winner') && (
                        <span className="badge" style={{ background: '#defbe6', color: '#198038', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Победитель</span>
                      )}
                      {(item.status === 'RESERVE' || item.result === 'reserve') && (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14} /> Второе место (Резерв)</span>
                      )}
                      {(item.status === 'REJECTED' || item.status === 'LOST' || item.result === 'rejected') && (
                        <span className="badge" style={{ background: '#ffe5e5', color: '#da1e28', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={14} /> Не допущен / Отклонён</span>
                      )}
                      {(!['WINNER', 'ACCEPTED', 'RESERVE', 'REJECTED', 'LOST', 'winner', 'reserve', 'rejected'].includes(item.status || item.result)) && (
                        <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>На рассмотрении</span>
                      )}
                    </td>
                    <td>{item.updated_at ? new Date(item.updated_at).toLocaleDateString('ru-RU') : (item.date || '—')}</td>
                    <td style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Детали</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierHistory;
