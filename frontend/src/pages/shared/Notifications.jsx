import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Bell, Check, Info, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

const Notifications = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Generate role-based mock notifications
    if (user?.role === 'admin') {
      setNotifications([
        { id: 1, type: 'warning', title: 'Запрос на сброс пароля', message: 'ТОО "Азия Строй" запрашивает сброс пароля. Требуется подтверждение.', time: '10 минут назад', read: false },
        { id: 2, type: 'info', title: 'Системное уведомление', message: 'Резервное копирование базы данных успешно завершено.', time: '2 часа назад', read: true },
        { id: 3, type: 'success', title: 'Новый организатор', message: 'Зарегистрирован новый организатор: АО "Самрук-Казына".', time: '1 день назад', read: true },
      ]);
    } else if (user?.role === 'organizer') {
      setNotifications([
        { id: 1, type: 'success', title: 'Новая заявка на лот', message: 'Поступила новая заявка на лот #12 "Поставка компьютеров".', time: '15 минут назад', read: false },
        { id: 2, type: 'info', title: 'Вопрос по тендеру', message: 'Участник задал вопрос по спецификации к тендеру #45.', time: '3 часа назад', read: false },
        { id: 3, type: 'warning', title: 'Сроки поджимают', message: 'Прием заявок по лоту #8 заканчивается через 24 часа.', time: '1 день назад', read: true },
      ]);
    } else {
      // Supplier
      setNotifications([
        { id: 1, type: 'success', title: 'Вы признаны победителем!', message: 'Поздравляем! Ваша заявка выиграла в тендере "Поставка мебели". Ожидайте договор.', time: '1 час назад', read: false },
        { id: 2, type: 'info', title: 'Приглашение к торгам', message: 'Организатор приглашает вас принять участие в новом тендере.', time: '4 часа назад', read: false },
        { id: 3, type: 'warning', title: 'Требуется подпись', message: 'Пожалуйста, подпишите протокол итогов по лоту #10 с помощью ЭЦП.', time: '2 дня назад', read: true },
      ]);
    }
  }, [user]);

  const getIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={20} color="var(--pk-warning)" />;
      case 'success': return <ShieldCheck size={20} color="var(--pk-success)" />;
      default: return <Info size={20} color="var(--pk-primary)" />;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bell size={28} color="var(--pk-primary)" />
            Уведомления
            {unreadCount > 0 && (
              <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>{unreadCount} новых</span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={16} /> Прочитать все
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--pk-text-secondary)' }}>
            <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <p>У вас нет новых уведомлений</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                style={{ 
                  padding: '1.25rem', 
                  borderBottom: index !== notifications.length - 1 ? '1px solid var(--pk-border)' : 'none',
                  backgroundColor: notif.read ? 'transparent' : 'var(--pk-bg-main)',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  transition: 'background 0.2s',
                  borderRadius: '8px'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--pk-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--pk-border)' }}>
                  {getIcon(notif.type)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--pk-text-main)' }}>{notif.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--pk-text-secondary)', whiteSpace: 'nowrap' }}>{notif.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pk-text-secondary)', lineHeight: 1.5 }}>{notif.message}</p>
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
