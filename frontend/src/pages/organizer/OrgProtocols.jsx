import React, { useState } from 'react';
import { Search, Edit2, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OrgProtocols = () => {
  const navigate = useNavigate();
  const [protocols] = useState([
    {
      id: 1,
      tenderNumber: 'T-2023-890',
      title: 'Бетонные и земельные работы на Участке А',
      endDate: '18.04.2024 15:00',
      bidsCount: 8,
      status: 'awaiting_opening'
    },
    {
      id: 2,
      tenderNumber: 'T-2023-881',
      title: 'Муровочные и кладочные работы стен административного корпуса',
      endDate: '10.04.2024 10:00',
      bidsCount: 3,
      status: 'published',
      winner: 'ТОО "СнабИнвестПром"'
    },
    {
      id: 3,
      tenderNumber: 'T-2023-840',
      title: 'Строительство модульного ангара и прокладка инженерных сетей',
      endDate: '01.04.2024 12:00',
      bidsCount: 1,
      status: 'failed'
    }
  ]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: 0 }}>Протоколы итогов</h1>
          <p className="text-secondary" style={{ color: 'var(--pk-text-secondary)', marginTop: '0.5rem' }}>Формирование протоколов вскрытия и подведения итогов</p>
        </div>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-warning)' }}>
          <div className="stat-val text-warning" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-warning)', marginBottom: '0.5rem' }}>8</div>
          <div className="stat-title text-sec">Ожидают вскрытия (Черновики)</div>
        </div>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-success)' }}>
          <div className="stat-val text-success" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-success)', marginBottom: '0.5rem' }}>54</div>
          <div className="stat-title text-sec">Опубликовано итогов за год</div>
        </div>
        <div className="stat-card card" style={{ borderTop: '4px solid var(--pk-danger)' }}>
          <div className="stat-val text-danger" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--pk-danger)', marginBottom: '0.5rem' }}>2</div>
          <div className="stat-title text-sec">Закупки не состоялись</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h3 className="mb-0" style={{ margin: 0 }}>Завершенные и рассматриваемые тендеры</h3>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input type="text" className="form-control form-control-sm" placeholder="Поиск по лоту или дате..." style={{ paddingLeft: '2rem', width: '250px' }} />
          </div>
        </div>
        
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>Лот / Имя тендера</th>
                <th>Дата окончания</th>
                <th>Кол-во заявок</th>
                <th>Статус / Победитель</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{p.tenderNumber}</strong><br />
                    <span className="text-sm text-secondary">{p.title}</span>
                  </td>
                  <td>{p.endDate}</td>
                  <td>
                    <span className="badge" style={{ background: p.status === 'awaiting_opening' ? 'var(--pk-primary-light)' : '#f4f7f9', color: p.status === 'awaiting_opening' ? 'var(--pk-primary)' : 'inherit', border: p.status !== 'awaiting_opening' ? '1px solid var(--pk-border)' : 'none' }}>
                      {p.bidsCount} заявок
                    </span>
                  </td>
                  <td>
                    {p.status === 'awaiting_opening' && <span className="badge badge-warning">Ожидает вскрытия</span>}
                    {p.status === 'published' && (
                      <>
                        <strong>{p.winner}</strong><br />
                        <span className="badge badge-success" style={{ marginTop: '0.25rem' }}>Опубликовано</span>
                      </>
                    )}
                    {p.status === 'failed' && <span className="badge" style={{ background: '#ffebee', color: '#d32f2f' }}>Не состоялась</span>}
                  </td>
                  <td>
                    {p.status === 'awaiting_opening' && (
                      <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate(`/organizer/tenders/${p.id}/evaluate`)}>
                        <Edit2 size={16} /> Вскрыть конверты
                      </button>
                    )}
                    {p.status === 'published' && (
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Eye size={16} /> Протокол Итогов
                      </button>
                    )}
                    {p.status === 'failed' && (
                      <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Eye size={16} /> Отчет о несостоявшейся
                      </button>
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

export default OrgProtocols;
