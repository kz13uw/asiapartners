import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, FileText, Users, Search, RefreshCw, BarChart2, Eye } from 'lucide-react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

import { useTranslation } from '../../store/useLanguageStore';

const MonitoringDashboard = () => {
  const { lang, t } = useTranslation();
  const [stats, setStats] = useState({
    total_tenders: 0,
    total_users: 0,
    total_companies: 0,
    total_bids: 0
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await adminAPI.stats();
      if (statsRes.data) {
        setStats(statsRes.data);
      }

      const logsRes = await adminAPI.auditLog(100);
      if (logsRes.data && Array.isArray(logsRes.data)) {
        setAuditLogs(logsRes.data);
      }
    } catch (e) {
      console.warn('API error fetching monitoring data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.ip_address && log.ip_address.includes(searchTerm))
  );

  return (
    <div className="fade-in container" style={{ padding: '2rem 1rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity color="var(--pk-primary)" size={28} /> {t('mon_title')}
          </h1>
          <p className="text-secondary" style={{ margin: 0 }}>Отслеживание активности закупок, аудит действий ЭЦП и системная статистика</p>
        </div>

        <button className="btn btn-outline" onClick={fetchData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Обновить данные
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)', border: '1px solid #c7d2fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#4338ca', fontWeight: 600 }}>Всего тендеров</span>
            <FileText color="#4338ca" size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3730a3' }}>{stats.total_tenders}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)', border: '1px solid #a7f3d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#047857', fontWeight: 600 }}>Всего заявок</span>
            <BarChart2 color="#047857" size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#065f46' }}>{stats.total_bids}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: '1px solid #fed7aa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#c2410c', fontWeight: 600 }}>{t('stat_suppliers') || 'Поставщики'}</span>
            <Users color="#c2410c" size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9a3412' }}>{stats.total_companies}</div>
        </div>

        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 600 }}>Пользователей</span>
            <ShieldCheck color="#15803d" size={20} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534' }}>{stats.total_users}</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Eye size={20} color="var(--pk-primary)" /> Журнал фиксации событий аудита (Audit Trail)
          </h2>

          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск по действию или IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', backgroundColor: 'var(--pk-bg-main)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Действие</th>
                <th style={{ padding: '0.75rem 1rem' }}>Объект</th>
                <th style={{ padding: '0.75rem 1rem' }}>ID Пользователя</th>
                <th style={{ padding: '0.75rem 1rem' }}>IP-адрес</th>
                <th style={{ padding: '0.75rem 1rem' }}>Штамп времени (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--pk-text-secondary)' }}>
                    Записи аудита не найдены
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>#{log.id}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ backgroundColor: log.action.includes('EDS') ? '#defbe6' : '#e5f6ff', color: log.action.includes('EDS') ? '#198038' : '#0043ce' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{log.entity_type}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>Пользователь #{log.user_id}</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{log.ip_address || '127.0.0.1'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--pk-text-secondary)' }}>
                      {new Date(log.created_at).toLocaleString('ru-RU')}
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

export default MonitoringDashboard;
