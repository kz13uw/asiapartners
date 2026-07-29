import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI } from '../../api';

const TenderSearch = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tendersAPI.list();
        setTenders(res.data.items);
      } catch (error) {
        console.error("Failed to load tenders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTenders();
  }, []);

  return (
    <div className="fade-in">
      <h2 className="mb-3">Реестр открытых тендеров</h2>
      <div className="card mb-3" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <input type="text" className="form-control" placeholder="Поиск по наименованию или номеру..." style={{ flex: 1, minWidth: '200px' }} />
        <select className="form-control" style={{ width: 'auto', minWidth: '250px' }}>
          <option>Все методы закупок</option>
          <option>Одноэтапный тендер на понижение</option>
          <option>Двухэтапный тендер на понижение</option>
        </select>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={18} /> Найти
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>№ Тендера</th>
                <th>Наименование</th>
                <th>Метод</th>
                <th>Сумма (тнг)</th>
                <th>Статус</th>
                <th>Действие</th>
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
                    <td style={{ fontWeight: 600 }}>{tender.start_price.toLocaleString('ru-RU')}</td>
                    <td><span className="badge badge-success">Прием заявок</span></td>
                    <td>
                      <Link to={`/tenders/${tender.id}`} className="btn btn-outline btn-sm">Детали лота</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--pk-text-secondary)' }}>
                    Тендеры не найдены
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

export default TenderSearch;
