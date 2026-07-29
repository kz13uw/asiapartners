import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Save, Download, Search, Filter, Activity, Users, Scale, CheckCircle2, FileText, AlertCircle, Clock } from 'lucide-react';

export const AdminSettings = () => {
  const [loading, setLoading] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Настройки успешно сохранены');
    }, 800);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', marginBottom: '1.5rem' }}>Глобальные настройки</h1>
      <div className="card" style={{ padding: '2rem', maxWidth: '800px' }}>
        
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--pk-text-main)' }}>Режим работы портала</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
              <input 
                type="checkbox" 
                checked={maintenance}
                onChange={() => setMaintenance(!maintenance)}
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{ 
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: maintenance ? 'var(--pk-danger)' : '#cbd5e1', 
                transition: '.4s', borderRadius: '34px' 
              }}>
                <span style={{ 
                  position: 'absolute', height: '18px', width: '18px', 
                  left: maintenance ? '28px' : '4px', bottom: '4px', 
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%' 
                }}></span>
              </span>
            </label>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--pk-text-main)' }}>Режим технического обслуживания</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pk-text-sec)' }}>При включении портал будет недоступен для поставщиков и организаторов.</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--pk-text-main)' }}>Системные уведомления</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Email адрес администратора (для оповещений)</label>
            <input type="email" className="form-control" defaultValue="admin@asiapartners.kz" />
          </div>
          <div className="form-group">
            <label className="form-label">Почтовый сервер (SMTP)</label>
            <input type="text" className="form-control" defaultValue="smtp.yandex.ru:465" />
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--pk-text-main)' }}>Безопасность и Лимиты</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Максимальный размер загружаемого файла (МБ)</label>
            <input type="number" className="form-control" defaultValue={50} style={{ maxWidth: '200px' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Таймаут сессии (минут неактивности)</label>
            <input type="number" className="form-control" defaultValue={60} style={{ maxWidth: '200px' }} />
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Save size={18} /> {loading ? 'Сохранение...' : 'Сохранить настройки'}
        </button>
      </div>
    </div>
  );
};

export const AdminSecurity = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const logs = [
    { id: 1, date: '2026-06-25 10:15:32', user: 'ТОО "Азия Строй"', ip: '192.168.1.45', action: 'Авторизация (ЭЦП)', status: 'success' },
    { id: 2, date: '2026-06-25 10:12:05', user: 'admin', ip: '10.0.0.5', action: 'Изменение пароля пользователя', status: 'success' },
    { id: 3, date: '2026-06-25 09:45:11', user: 'ТОО "КазПром"', ip: '185.120.44.2', action: 'Подача заявки на лот #12', status: 'success' },
    { id: 4, date: '2026-06-25 09:30:00', user: 'Неизвестный', ip: '45.22.11.9', action: 'Попытка входа', status: 'error' },
    { id: 5, date: '2026-06-25 09:15:22', user: 'Организатор #1', ip: '192.168.1.10', action: 'Публикация тендера', status: 'success' },
  ];

  const filteredLogs = logs.filter(log => log.user.toLowerCase().includes(searchTerm.toLowerCase()) || log.action.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', margin: 0 }}>Журнал аудита</h1>
          <p style={{ color: 'var(--pk-text-sec)', marginTop: '0.25rem' }}>Мониторинг действий пользователей и событий безопасности</p>
        </div>
        <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} /> Скачать лог
        </button>
      </div>

      <div className="card">
        <div className="toolbar" style={{ borderBottom: '1px solid #f1f5f9', padding: '1.5rem', display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Поиск по логам..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={18}/> Фильтры</button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Дата / Время</th>
                <th>Пользователь</th>
                <th>IP-адрес</th>
                <th>Действие</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--pk-text-sec)' }}><Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> {log.date}</td>
                  <td style={{ fontWeight: 500 }}>{log.user}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{log.ip}</td>
                  <td>{log.action}</td>
                  <td>
                    {log.status === 'success' ? (
                      <span className="badge badge-success"><CheckCircle2 size={12} style={{marginRight:'4px'}}/> Успешно</span>
                    ) : (
                      <span className="badge badge-danger"><AlertCircle size={12} style={{marginRight:'4px'}}/> Ошибка</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pk-text-sec)' }}>Записи не найдены</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminReports = () => {
  const handleExport = (type) => {
    toast.success(`Генерация отчета (${type})... Пожалуйста, подождите.`);
  };

  const stats = [
    { title: 'Зарегистрировано ТОО', value: '142', icon: Users, color: 'var(--pk-primary)', bg: 'var(--pk-primary-bg)' },
    { title: 'Активных лотов', value: '18', icon: Scale, color: 'var(--pk-accent)', bg: 'var(--pk-accent-bg)' },
    { title: 'Заключено договоров', value: '356', icon: FileText, color: 'var(--pk-success)', bg: 'var(--pk-success-bg)' },
  ];

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', marginBottom: '1.5rem' }}>Отчеты и Аналитика</h1>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--pk-text-sec)', fontWeight: 500 }}>{stat.title}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--pk-text-main)' }}>{stat.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--pk-text-main)' }}>Генерация отчетов</h3>
        <p style={{ color: 'var(--pk-text-sec)', marginBottom: '2rem' }}>Выберите тип отчета для выгрузки. Данные будут выгружены за текущий год.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '800px' }}>
          
          <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Activity color="var(--pk-primary)" size={24} />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Активность пользователей</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pk-text-sec)', flexGrow: 1 }}>
              Отчет о количестве авторизаций, поданных заявок и созданных лотов по всем ролям.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleExport('Excel')} className="btn btn-outline" style={{ flexGrow: 1, fontSize: '0.85rem' }}>Excel (.xlsx)</button>
              <button onClick={() => handleExport('PDF')} className="btn btn-outline" style={{ flexGrow: 1, fontSize: '0.85rem' }}>PDF</button>
            </div>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Scale color="var(--pk-accent)" size={24} />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Сводка по закупкам</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pk-text-sec)', flexGrow: 1 }}>
              Финансовая статистика: общие бюджеты, экономия по итогам тендеров.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => handleExport('Excel')} className="btn btn-outline" style={{ flexGrow: 1, fontSize: '0.85rem' }}>Excel (.xlsx)</button>
              <button onClick={() => handleExport('PDF')} className="btn btn-outline" style={{ flexGrow: 1, fontSize: '0.85rem' }}>PDF</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
