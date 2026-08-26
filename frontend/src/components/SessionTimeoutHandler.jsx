import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const SESSION_LIMIT_MS = 10 * 60 * 1000; // 10 минут = 600,000 мс

const SessionTimeoutHandler = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);

      // Предупреждение за 1 минуту до окончания (на 9-й минуте)
      warningRef.current = setTimeout(() => {
        toast('⏳ Ваша сессия завершится через 1 минуту неактивности.', {
          duration: 5000,
          icon: '⏰',
          style: { background: '#fffbebf0', color: '#b45309', border: '1px solid #fde68a' }
        });
      }, SESSION_LIMIT_MS - 60 * 1000);

      // Автоматический выход через 10 минут
      timeoutRef.current = setTimeout(() => {
        logout();
        toast.error('🔒 Сессия завершена (10 минут бездействия). Пожалуйста, войдите снова.');
        navigate('/login');
      }, SESSION_LIMIT_MS);
    };

    // Слушатели событий активности пользователя
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [isAuthenticated, logout, navigate]);

  return null;
};

export default SessionTimeoutHandler;
