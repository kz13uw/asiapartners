import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, Building2, Package, ArrowRight } from 'lucide-react';
import { tendersAPI } from '../api';

const mockTenders = [
  {
    id: 1,
    title: 'Поставка строительных материалов (Цемент М500)',
    organizer_name: 'ТОО "Азия Строй"',
    budget: 15000000,
    status: 'published',
    end_date: '2026-07-01T15:00:00Z',
    type: 'request_for_quotation'
  },
  {
    id: 2,
    title: 'Услуги по аренде спецтехники (Экскаваторы, Погрузчики)',
    organizer_name: 'АО "Холдинг Азия"',
    budget: 45000000,
    status: 'published',
    end_date: '2026-07-10T12:00:00Z',
    type: 'open_tender'
  },
  {
    id: 3,
    title: 'Поставка спецодежды и СИЗ для рабочих',
    organizer_name: 'ТОО "Азия Безопасность"',
    budget: 8500000,
    status: 'published',
    end_date: '2026-06-30T18:00:00Z',
    type: 'request_for_quotation'
  }
];

const PublicTenders = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTenders = async () => {
      try {
        const res = await tendersAPI.list({ status: 'published' });
        setTenders(res.data || []);
      } catch (err) {
        console.warn('API error, using mock data for public tenders');
        setTenders(mockTenders);
      } finally {
        setLoading(false);
      }
    };
    fetchTenders();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount);
  };

  const filteredTenders = tenders.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.organizer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fade-in" style={{ padding: '4rem 2rem', minHeight: 'calc(100vh - 200px)', backgroundColor: '#f8fafc' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--pk-text-main)' }}>Реестр закупок</h1>
            <p style={{ color: 'var(--pk-text-sec)', marginTop: '0.5rem', fontSize: '1.1rem' }}>Открытые тендеры группы компаний Asia Partners</p>
          </div>
          <Link to="/login" className="btn btn-primary">Подать заявку (Войти)</Link>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ flexGrow: 1, position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Поиск по названию или заказчику..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '3rem' }}
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} /> Фильтры
          </button>
        </div>

        {/* Tender List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--pk-text-sec)' }}>Загрузка закупок...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {filteredTenders.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                <Package size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
                <h3 style={{ margin: 0, color: 'var(--pk-text-main)' }}>Ничего не найдено</h3>
                <p style={{ color: 'var(--pk-text-sec)', marginTop: '0.5rem' }}>Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              filteredTenders.map(tender => (
                <div key={tender.id} className="card hover-scale" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                  <div style={{ flexGrow: 1, paddingRight: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <span className="badge badge-success">Прием заявок</span>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Лот №{tender.id}</span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', margin: '0 0 1rem 0', color: 'var(--pk-text-main)' }}>{tender.title}</h3>
                    
                    <div style={{ display: 'flex', gap: '2rem', color: 'var(--pk-text-sec)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color="var(--pk-primary)" />
                        {tender.organizer_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="var(--pk-accent)" />
                        Окончание: {new Date(tender.end_date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', minWidth: '200px', borderLeft: '1px solid #f1f5f9', paddingLeft: '2rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--pk-text-sec)', marginBottom: '0.25rem' }}>Бюджет лота</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--pk-text-main)', marginBottom: '1.5rem' }}>
                      {formatCurrency(tender.budget)}
                    </div>
                    <Link to="/login" className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      Участвовать <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTenders;
