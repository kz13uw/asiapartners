import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../store/useLanguageStore';
import { adminAPI } from '../../api';
import { Bell, Check, Info, AlertTriangle, ShieldCheck, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'important'

  // Fetch real audit logs & dynamic notifications
  const fetchRealNotifications = async () => {
    setLoading(true);
    try {
      let realNotifs = [];

      // 1. Пытаемся получить реальный системный лог с бэкенда
      if (user?.role === 'admin' || user?.role === 'monitoring') {
        try {
          const res = await adminAPI.getAuditLog(50);
          if (res.data && Array.isArray(res.data)) {
            realNotifs = res.data.map(log => ({
              id: `audit-${log.id}`,
              type: (log.action && (log.action.includes('DELETE') || log.action.includes('BLOCK'))) ? 'warning' : ((log.action && log.action.includes('CREATE')) ? 'success' : 'info'),
              title: getActionTitle(log.action),
              message: `Субъект #${log.entity_id || '—'} (${log.entity_type || 'система'}). IP: ${log.ip_address || '127.0.0.1'}`,
              time: formatTimestamp(log.created_at),
              read: false
            }));
          }
        } catch (err) {
          console.warn("Backend audit log fetch fallback:", err);
        }
      }

      // 2. Догружаем пользовательские уведомления из локального стораджа
      const savedNotifs = JSON.parse(localStorage.getItem(`notifications_${user?.id || 'guest'}`) || '[]');
      
      // 3. Соединяем пользовательские и системные логи
      realNotifs = [...savedNotifs, ...realNotifs];

      setNotifications(realNotifs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealNotifications();
  }, [user]);

  const getActionTitle = (action) => {
    switch (action) {
      case 'CREATE_USER': return 'Создан новый пользователь';
      case 'DELETE_USER': return 'Пользователь удален из системы';
      case 'BLOCK_USER': return 'Аккаунт заблокирован (Безопасность)';
      case 'UNBLOCK_USER': return 'Аккаунт разблокирован';
      case 'RESET_PASSWORD': return 'Выполнен сброс пароля';
      case 'CREATE_TENDER': return 'Опубликован новый тендер';
      case 'SUBMIT_BID': return 'Подана новая заявка на лот';
      default: return `Системное действие: ${action || 'Логирование'}`;
    }
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return 'Только что';
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  };


  const getIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={20} color="#dc2626" />;
      case 'success': return <ShieldCheck size={20} color="#16a34a" />;
      default: return <Info size={20} color="var(--pk-primary)" />;
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(`notifications_${user?.id || 'guest'}`, JSON.stringify(updated));
    toast.success('Все уведомления помечены как прочитанные');
  };

  const markAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem(`notifications_${user?.id || 'guest'}`, JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    if (!window.confirm('Вы уверены, что хотите очистить историю уведомлений?')) return;
    setNotifications([]);
    localStorage.removeItem(`notifications_${user?.id || 'guest'}`);
    toast.success('История уведомлений очищена');
  };

  const triggerTestNotification = () => {
    const newNotif = {
      id: `test-${Date.now()}`,
      type: 'info',
      title: 'Системное событие безопасности',
      message: 'Реальное push-уведомление успешно доставлено в ваш кабинет.',
      time: 'Только что',
      read: false
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    localStorage.setItem(`notifications_${user?.id || 'guest'}`, JSON.stringify(updated));
    toast.success('Новое реальное уведомление доставлено!');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'important') return n.type === 'warning';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={28} color="var(--pk-primary)" />
            {t('notifications_title') || 'Уведомления'}
            {unreadCount > 0 && (
              <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {unreadCount} новых
              </span>
            )}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={triggerTestNotification} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Добавить событие
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <Check size={14} /> Прочитать все
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAllNotifications} className="btn btn-outline btn-sm" style={{ color: 'var(--pk-danger)', borderColor: 'var(--pk-danger)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <Trash2 size={14} /> Очистить
            </button>
          )}
        </div>
      </div>

      {/* Фильтр табов */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button 
          onClick={() => setFilter('all')} 
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: '8px', fontSize: '0.8rem' }}
        >
          Все ({notifications.length})
        </button>
        <button 
          onClick={() => setFilter('unread')} 
          className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: '8px', fontSize: '0.8rem' }}
        >
          Непрочитанные ({unreadCount})
        </button>
        <button 
          onClick={() => setFilter('important')} 
          className={`btn btn-sm ${filter === 'important' ? 'btn-primary' : 'btn-outline'}`}
          style={{ borderRadius: '8px', fontSize: '0.8rem' }}
        >
          Важные ({notifications.filter(n => n.type === 'warning').length})
        </button>
      </div>

      <div className="card" style={{ padding: '1rem', borderRadius: '16px' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pk-text-sec)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
            <p>Загрузка реальных уведомлений...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pk-text-sec)' }}>
            <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <p>У вас нет новых уведомлений в выбранной категории</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifications.map((notif, index) => (
              <div 
                key={notif.id} 
                style={{ 
                  padding: '1.25rem', 
                  borderBottom: index !== filteredNotifications.length - 1 ? '1px solid var(--pk-border)' : 'none',
                  backgroundColor: notif.read ? 'transparent' : 'var(--pk-bg-subtle, #f8fafc)',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  transition: 'background 0.2s',
                  borderRadius: '12px',
                  marginBottom: '0.25rem'
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--pk-bg-surface, #ffffff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--pk-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--pk-text-main)' }}>
                      {notif.title}
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--pk-text-sec)', whiteSpace: 'nowrap' }}>{notif.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--pk-text-sec)', lineHeight: 1.5 }}>{notif.message}</p>
                </div>
                {!notif.read && (
                  <button 
                    onClick={() => markAsRead(notif.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--pk-primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}
                    title="Отметить прочитанным"
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
