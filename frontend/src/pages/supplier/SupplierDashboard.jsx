import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Bell, Search } from 'lucide-react';
import { tendersAPI } from '../../api';

const SupplierDashboard = () => {
  const [activeTab, setActiveTab] = useState('tenders');
  const [myBids, setMyBids] = useState([]); // В реальном АПИ будет эндпоинт bids/my

  useEffect(() => {
    // Временно получаем список тендеров, т.к. бэкенд для myBids еще пишется
    const fetchBids = async () => {
      try {
        const res = await tendersAPI.list({ size: 3 });
        setMyBids(res.data.items);
      } catch (e) {
        console.error(e);
      }
    };
    fetchBids();
  }, []);

  return (
    <div className="fade-in">
      <h2 className="mb-3">Сводка по контрагенту</h2>
      
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Активные формы участия</div>
          <div className="stat-value text-primary" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-primary)' }}>4</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Новые уведомления</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-warning)' }}>12</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Статус аккредитации</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--pk-success)', marginTop: '0.5rem' }}>✓ Пройдена</div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--pk-border)', marginBottom: '1.5rem' }}>
          <div 
            className={`tab ${activeTab === 'tenders' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tenders')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'tenders' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'tenders' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'tenders' ? 600 : 400 }}
          >
            Мои заявки
          </div>
          <div 
            className={`tab ${activeTab === 'docs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('docs')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'docs' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'docs' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'docs' ? 600 : 400 }}
          >
            Мои Документы
          </div>
          <div 
            className={`tab ${activeTab === 'notif' ? 'active' : ''}`} 
            onClick={() => setActiveTab('notif')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'notif' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'notif' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'notif' ? 600 : 400 }}
          >
            Уведомления
          </div>
        </div>
        
        {activeTab === 'tenders' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Текущие заявки</h4>
              <div className="search-box" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
                <input type="text" className="form-control form-control-sm" placeholder="Поиск..." style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
            
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>№ Тендера</th>
                    <th>Наименование</th>
                    <th>Статус лота</th>
                    <th>Мой статус</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {myBids.map((tender) => (
                    <tr key={tender.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{tender.number}</td>
                      <td>{tender.title}</td>
                      <td><span className="badge badge-success">Прием заявок</span></td>
                      <td><span className="badge badge-primary">Заявка подана</span></td>
                      <td>
                        <Link to={`/tenders/${tender.id}`} className="btn btn-outline btn-sm">Детали</Link>
                      </td>
                    </tr>
                  ))}
                  {myBids.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Нет поданных заявок</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>Электронное хранилище документов</h4>
                <p className="text-secondary text-sm" style={{ margin: 0 }}>Эти документы можно быстро прикреплять к новым заявкам на тендер</p>
              </div>
              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} /> Добавить документ
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ border: '1px solid var(--pk-border)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', background: '#fafafa' }}>
                <div style={{ background: '#e0e0e0', padding: '1rem', borderRadius: '8px' }}><FileText size={24} color="#757575" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Лицензия на СМР</div>
                  <div className="text-sm text-secondary">Обновлено: 12.01.2024</div>
                </div>
              </div>

              <div style={{ border: '1px solid var(--pk-border)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', background: '#fafafa' }}>
                <div style={{ background: '#e0e0e0', padding: '1rem', borderRadius: '8px' }}><FileText size={24} color="#757575" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Справка об отсутствии налоговой задолженности</div>
                  <div className="text-sm text-secondary">Срок действия: до 15.08.2024</div>
                </div>
              </div>

              <div style={{ border: '1px dashed var(--pk-border)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#f0f0f0'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ background: '#f0f0f0', padding: '1rem', borderRadius: '8px' }}><FileText size={24} color="#a0a0a0" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--pk-primary)' }}>Загрузить новый файл...</div>
                  <div className="text-sm text-secondary">PDF, DOCX до 10 МБ</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notif' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ border: '1px solid var(--pk-border)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={18} className="text-sec" /> Изменение в документации лота
              </div>
              <div className="text-sm text-sec" style={{ marginTop: '0.5rem' }}>Организатор добавил новое техническое задание. Просьба ознакомиться в разделе документации.</div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;
