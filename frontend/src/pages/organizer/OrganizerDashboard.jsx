import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useTenders } from '../../hooks/useTenders';

const OrganizerDashboard = () => {
  const { tenders, loading } = useTenders('my');

  return (
    <div className="fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Панель Организатора Закупок</h2>
        <Link to="/organizer/tenders/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={18} /> Опубликовать тендер
        </Link>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Активных тендеров</div>
          <div className="stat-value text-primary" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-primary)' }}>{tenders.length}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Ожидают вскрытия</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-warning)' }}>0</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Успешно закрытых</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-success)' }}>12</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Реестр моих тендеров</h4>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input type="text" className="form-control form-control-sm" placeholder="Поиск по номеру или названию..." style={{ paddingLeft: '2rem' }} />
          </div>
        </div>
        
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>№ Тендера</th>
                <th>Наименование тендера</th>
                <th>Метод</th>
                <th>Прием заявок (до)</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}><span className="loader-spinner"></span></td></tr>
              ) : tenders.length > 0 ? (
                tenders.map((tender) => (
                  <tr key={tender.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{tender.number}</td>
                    <td>{tender.title}</td>
                    <td>{tender.method === 'one_stage' ? 'Одноэтапный' : 'Двухэтапный'}</td>
                    <td>{new Date(tender.deadline_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      {tender.status === 'draft' ? <span className="badge" style={{backgroundColor: '#e0e0e0', color: '#333'}}>Черновик</span> :
                       tender.status === 'published' ? <span className="badge badge-success">Опубликован</span> :
                       <span className="badge badge-primary">{tender.status}</span>}
                    </td>
                    <td>
                      <Link to={`/organizer/tenders/${tender.id}/evaluate`} className="btn btn-outline btn-sm">Вскрытие / Оценка</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--pk-text-secondary)' }}>
                    У вас пока нет созданных тендеров
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
