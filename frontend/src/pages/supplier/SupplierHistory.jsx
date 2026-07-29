import React, { useState } from 'react';
import { Search, Trophy, Layers, XCircle, FileText, CheckCircle2, AlertCircle, FileX } from 'lucide-react';

const SupplierHistory = () => {
  const [history] = useState([
    {
      id: 1,
      number: 'T-2022-990',
      title: 'Монтаж систем вентиляции и кондиционирования',
      amount: 2100000,
      date: '10.12.2023',
      result: 'winner'
    },
    {
      id: 2,
      number: 'T-2022-871',
      title: 'Капитальный ремонт логистического склада',
      amount: 10500000,
      date: '28.11.2023',
      result: 'reserve'
    },
    {
      id: 3,
      number: 'T-2022-540',
      title: 'Строительство Дата-Центра "под ключ"',
      amount: 150000000,
      date: '05.09.2023',
      result: 'rejected'
    }
  ]);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: 0 }}>История и итоги тендеров</h1>
      </div>

      <div className="history-stats" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-success)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-success)' }}>14</div>
            <div className="h-stat-label" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginTop: '0.25rem' }}>Выигранных тендеров</div>
          </div>
          <Trophy size={48} color="#defbe6" />
        </div>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-primary)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-primary)' }}>32</div>
            <div className="h-stat-label" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginTop: '0.25rem' }}>Всего заявок подано</div>
          </div>
          <Layers size={48} color="var(--pk-primary-light)" />
        </div>
        <div className="h-stat" style={{ flex: 1, background: 'var(--pk-bg-surface)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', border: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--pk-danger)' }}>
          <div>
            <div className="h-stat-val" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--pk-danger)' }}>18</div>
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
            <input type="text" className="form-control form-control-sm" placeholder="Поиск в истории..." style={{ paddingLeft: '2rem', width: '250px' }} />
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
              {history.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{item.number}</td>
                  <td>{item.title}</td>
                  <td style={{ fontWeight: 600 }}>{item.amount.toLocaleString('ru-RU')}</td>
                  <td>
                    {item.result === 'winner' && <span className="badge" style={{ background: '#defbe6', color: '#198038', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={14} /> Победитель</span>}
                    {item.result === 'reserve' && <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14} /> Второе место (Резерв)</span>}
                    {item.result === 'rejected' && <span className="badge" style={{ background: '#ffe5e5', color: '#da1e28', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={14} /> Не допущен по тех.спец.</span>}
                  </td>
                  <td>{item.date}</td>
                  <td style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
                    {item.result === 'winner' && (
                      <>
                        <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Договор</button>
                        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Протокол</button>
                      </>
                    )}
                    {item.result === 'reserve' && (
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} /> Протокол итогов</button>
                    )}
                    {item.result === 'rejected' && (
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileX size={16} /> Причина отказа</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierHistory;
