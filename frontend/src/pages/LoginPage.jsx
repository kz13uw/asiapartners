import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Mail, KeyRound, UserCheck, Lock, RefreshCw, ArrowLeft, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/useLanguageStore';
import { authAPI } from '../api';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, registerSupplier } = useAuthStore();


  // Основная форма входа
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Модальное окно Регистрации Поставщика
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regStep, setRegStep] = useState(1); // 1 - данные, 2 - ввод OTP
  const [regForm, setRegForm] = useState({
    full_name: '',
    company_name: '',
    iin_bin: '',
    company_address: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    otp_code: ''
  });

  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Модальное окно «Забыли пароль?»
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 - email, 2 - OTP + новый пароль
  const [forgotForm, setForgotForm] = useState({
    email: '',
    otp_code: '',
    new_password: '',
    confirm_password: ''
  });
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Проверка требований к паролю (как в админ-панели и профиле)
  const evalRegPwd = regForm.password || '';
  const isRegLengthValid = evalRegPwd.length >= 8;
  const isRegHasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(evalRegPwd);
  const isRegHasDigits = /[0-9]/.test(evalRegPwd);
  const isRegMatch = evalRegPwd.length > 0 && evalRegPwd === regForm.confirm_password;
  const isRegPwdPolicyOk = isRegLengthValid && isRegHasLetters && isRegHasDigits;

  const evalForgotPwd = forgotForm.new_password || '';
  const isForgotLengthValid = evalForgotPwd.length >= 8;
  const isForgotHasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(evalForgotPwd);
  const isForgotHasDigits = /[0-9]/.test(evalForgotPwd);
  const isForgotMatch = evalForgotPwd.length > 0 && evalForgotPwd === forgotForm.confirm_password;
  const isForgotPwdPolicyOk = isForgotLengthValid && isForgotHasLetters && isForgotHasDigits && isForgotMatch;

  // Генератор надежного пароля (как в Админке)
  const generateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const nums = "23456789";
    const spec = "!@#$%^&*";
    let gen = "";
    gen += upper[Math.floor(Math.random() * upper.length)];
    gen += lower[Math.floor(Math.random() * lower.length)];
    gen += lower[Math.floor(Math.random() * lower.length)];
    gen += nums[Math.floor(Math.random() * nums.length)];
    gen += nums[Math.floor(Math.random() * nums.length)];
    gen += spec[Math.floor(Math.random() * spec.length)];
    const pool = upper + lower + nums + spec;
    for (let i = 0; i < 4; i++) {
      gen += pool[Math.floor(Math.random() * pool.length)];
    }
    return gen;
  };

  const handleGenerateRegPassword = () => {
    const pwd = generateStrongPassword();
    setRegForm(p => ({ ...p, password: pwd, confirm_password: pwd }));
    setShowRegPassword(true);
    setShowRegConfirmPassword(true);
    toast.success('⚡ Сгенерирован надежный пароль!');
  };

  const handleGenerateForgotPassword = () => {
    const pwd = generateStrongPassword();
    setForgotForm(p => ({ ...p, new_password: pwd, confirm_password: pwd }));
    setShowForgotNewPassword(true);
    setShowForgotConfirmPassword(true);
    toast.success('⚡ Сгенерирован надежный пароль!');
  };


  // Таймеры обратного отсчета Cooldown
  useEffect(() => {
    let timer;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => setCooldownSeconds(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    let timer;
    if (forgotCooldown > 0) {
      timer = setInterval(() => setForgotCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Обработка Входа (Email + Пароль)
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Укажите email и пароль');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login(email.trim().toLowerCase(), password);
      toast.success('Успешный вход!');
      const role = (loggedUser?.role || '').toLowerCase();
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'monitoring') navigate('/monitoring/dashboard');
      else if (role === 'organizer' || role === 'commission') navigate('/organizer/dashboard');
      else navigate('/supplier/dashboard');
    } catch (e) {
      console.error("Login error:", e);
      const msg = e.response?.data?.detail || (e.message?.includes('Network Error') ? 'Ошибка сети: Сервер бэкенда недоступен' : 'Неверный логин или пароль');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Запрос OTP кода для Регистрации
  const handleSendRegOtp = async (e) => {
    if (e) e.preventDefault();
    if (!regForm.full_name || !regForm.email || !regForm.password || !regForm.confirm_password) {
      toast.error('Заполните все обязательные поля');
      return;
    }
    if (!isRegPwdPolicyOk) {
      toast.error('Пароль должен содержать не менее 8 символов, включая буквы и цифры');
      return;
    }
    if (!isRegMatch) {
      toast.error('Введённые пароли не совпадают');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.sendOtp(regForm.email.trim(), 'register');
      toast.success(`Код подтверждения отправлен на ${regForm.email}`);
      setRegStep(2);
      setCooldownSeconds(60);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Ошибка отправки OTP-кода';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Завершение Регистрации по OTP
  const handleCompleteRegister = async (e) => {
    if (e) e.preventDefault();
    if (!regForm.otp_code || regForm.otp_code.trim().length !== 6) {
      toast.error('Введите 6-значный код подтверждения из письма');
      return;
    }

    setIsLoading(true);
    try {
      await registerSupplier({
        email: regForm.email.trim(),
        password: regForm.password,
        confirm_password: regForm.confirm_password,
        otp_code: regForm.otp_code.trim(),
        full_name: regForm.full_name.trim(),
        company_name: regForm.company_name.trim() || null,
        iin_bin: regForm.iin_bin.trim() || null,
        company_address: regForm.company_address.trim() || null,
        phone: regForm.phone.trim() || null
      });


      toast.success('🎉 Аккаунт поставщика успешно создан!');
      setShowRegisterModal(false);
      navigate('/supplier/dashboard');
    } catch (e) {

      const msg = e.response?.data?.detail || 'Ошибка регистрации. Проверьте код.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Запрос OTP кода для Сброса пароля
  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotForm.email) {
      toast.error('Введите почту для восстановления');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.sendOtp(forgotForm.email.trim(), 'reset_password');
      toast.success(`Код сброса пароля отправлен на ${forgotForm.email}`);
      setForgotStep(2);
      setForgotCooldown(60);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Пользователь не найден или ошибка отправки';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Сохранение нового пароля по OTP
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!forgotForm.otp_code || !forgotForm.new_password || !forgotForm.confirm_password) {
      toast.error('Заполните OTP-код, новый пароль и повтор пароля');
      return;
    }
    if (forgotForm.new_password !== forgotForm.confirm_password) {
      toast.error('Новый пароль и его подтверждение не совпадают!');
      return;
    }
    if (!isForgotPwdPolicyOk) {
      toast.error('Новый пароль должен содержать не менее 8 символов, включая буквы и цифры!');
      return;
    }


    setIsLoading(true);
    try {
      await authAPI.resetPassword({
        email: forgotForm.email.trim(),
        otp_code: forgotForm.otp_code.trim(),
        new_password: forgotForm.new_password
      });
      toast.success('✅ Пароль успешно изменён! Войдите с новым паролем.');
      setShowForgotModal(false);
      setEmail(forgotForm.email);
    } catch (e) {
      const msg = e.response?.data?.detail || 'Ошибка сброса пароля. Проверьте код.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1.5rem 1rem' }}>
      <div className="card glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', background: '#ffffff' }}>
        
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <ShieldCheck size={48} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.3rem', fontWeight: 800, color: '#0f172a' }}>
            Вход в личный кабинет
          </h2>
          <p className="text-sec" style={{ fontSize: '0.85rem', margin: 0 }}>
            Портал закупок холдинга Asia Partners
          </p>
        </div>

        {/* Форма Входа по Email + Пароль */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
              Логин (Электронная почта)
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Ваш email" 
                required 
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                {t('password_label')}
              </label>
              <button 
                type="button" 
                onClick={() => { setForgotForm({ email, otp_code: '', new_password: '' }); setForgotStep(1); setShowForgotModal(true); }} 
                style={{ background: 'none', border: 'none', color: 'var(--pk-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Забыли пароль?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-control" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
              />
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', borderRadius: '10px', fontWeight: 700 }} 
            disabled={isLoading}
          >
            {isLoading ? 'Выполняется вход...' : 'Войти в кабинет'}
          </button>
        </form>

        {/* Ссылка на Регистрацию */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 0.6rem 0' }}>
            Ещё нет аккаунта поставщика?
          </p>
          <button 
            type="button" 
            onClick={() => { setRegForm({ full_name: '', email: '', phone: '', password: '', confirm_password: '', otp_code: '' }); setRegStep(1); setShowRegisterModal(true); }}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', fontWeight: 700, borderColor: 'var(--pk-primary)', color: 'var(--pk-primary)' }}
          >
            <UserCheck size={18} style={{ marginRight: '0.4rem' }} /> Зарегистрироваться как Поставщик
          </button>
        </div>
      </div>


      {/* ========================================================= */}
      {/* 🚀 МОДАЛЬНОЕ ОКНО РЕГИСТРАЦИИ ПОСТАВЩИКА С OTP И ТРЕБОВАНИЯМИ К ПАРОЛЮ */}
      {/* ========================================================= */}
      {showRegisterModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '620px', background: '#ffffff', borderRadius: '16px', padding: '1.5rem 1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '92vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck color="var(--pk-primary)" size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Регистрация Поставщика</h3>
              </div>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>

            {regStep === 1 ? (
              <form onSubmit={handleSendRegOtp}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                      Наименование организации / ИП <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="ТОО «Asia Procurement» или ИП" 
                      value={regForm.company_name} 
                      onChange={e => setRegForm(p => ({ ...p, company_name: e.target.value }))} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                      БИН / ИИН организации <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      maxLength={12}
                      className="form-control" 
                      placeholder="12 цифр" 
                      value={regForm.iin_bin} 
                      onChange={e => setRegForm(p => ({ ...p, iin_bin: e.target.value.replace(/\D/g, '') }))} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                      ФИО Руководителя / Контактное лицо <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Иванов Иван Иванович" 
                      value={regForm.full_name} 
                      onChange={e => setRegForm(p => ({ ...p, full_name: e.target.value }))} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                      Юридический адрес компании <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="г. Алматы, ул. Абая 10" 
                      value={regForm.company_address} 
                      onChange={e => setRegForm(p => ({ ...p, company_address: e.target.value }))} 
                      required 
                    />
                  </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Электронная почта (Email) <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="supplier@example.com" 
                      value={regForm.email} 
                      onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Телефон</label>
                    <input 
                      type="tel" 
                      className="form-control" 
                      placeholder="+7 (707) 123-45-67" 
                      value={regForm.phone} 
                      onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} 
                    />
                  </div>
                </div>


                {/* Пароль и Подтверждение с Генерацией и Глазиком */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                      Пароль и подтверждение <span style={{ color: 'red' }}>*</span>
                    </span>
                    <button 
                      type="button"
                      onClick={handleGenerateRegPassword}
                      style={{ background: 'none', border: 'none', color: 'var(--pk-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
                    >
                      <Sparkles size={14} /> Сгенерировать пароль
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Пароль</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showRegPassword ? "text" : "password"} 
                          className="form-control" 
                          placeholder="Пароль" 
                          value={regForm.password} 
                          onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} 
                          required 
                          style={{ paddingRight: '2.2rem', fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          title={showRegPassword ? "Скрыть пароль" : "Показать пароль"}
                          style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                        >
                          {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>Повтор пароля</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showRegConfirmPassword ? "text" : "password"} 
                          className="form-control" 
                          placeholder="Повторите" 
                          value={regForm.confirm_password} 
                          onChange={e => setRegForm(p => ({ ...p, confirm_password: e.target.value }))} 
                          required 
                          style={{ paddingRight: '2.2rem', fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          title={showRegConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                          style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                        >
                          {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Визуальный Индикатор Требований к Паролю (Админ-стандарт) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.75rem', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: isRegLengthValid ? '#16a34a' : '#94a3b8', fontWeight: isRegLengthValid ? 700 : 400, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {isRegLengthValid ? '✓' : '○'} Мин. 8 символов
                    </span>
                    <span style={{ color: (isRegHasLetters && isRegHasDigits) ? '#16a34a' : '#94a3b8', fontWeight: (isRegHasLetters && isRegHasDigits) ? 700 : 400, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {(isRegHasLetters && isRegHasDigits) ? '✓' : '○'} Буквы и цифры
                    </span>
                    <span style={{ color: isRegMatch ? '#16a34a' : '#94a3b8', fontWeight: isRegMatch ? 700 : 400, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {isRegMatch ? '✓' : '○'} Совпадение паролей
                    </span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Отправка...' : '📩 Получить код подтверждения (OTP)'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteRegister}>
                <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '10px', textAlign: 'center', marginBottom: '1.25rem' }}>
                  <Mail size={32} color="#1e40af" style={{ marginBottom: '0.4rem' }} />
                  <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.95rem' }}>Проверьте вашу почту</div>
                  <div style={{ fontSize: '0.82rem', color: '#3b82f6', marginTop: '0.2rem' }}>Мы отправили 6-значный код на <strong>{regForm.email}</strong></div>
                </div>

                <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                    Введите 6-значный OTP-код из письма:
                  </label>
                  <input 
                    type="text" 
                    maxLength={6} 
                    className="form-control" 
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'monospace', maxWidth: '220px', margin: '0 auto' }} 
                    placeholder="123456" 
                    value={regForm.otp_code} 
                    onChange={e => setRegForm(p => ({ ...p, otp_code: e.target.value.replace(/\D/g, '') }))} 
                    required 
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setRegStep(1)} style={{ flex: 1, justifyContent: 'center' }}>
                    <ArrowLeft size={16} style={{ marginRight: '0.3rem' }} /> Назад
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    disabled={cooldownSeconds > 0 || isLoading} 
                    onClick={handleSendRegOtp}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <RefreshCw size={14} style={{ marginRight: '0.3rem' }} /> 
                    {cooldownSeconds > 0 ? `${cooldownSeconds} сек` : 'Отправить снова'}
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={isLoading}>
                  {isLoading ? 'Проверка...' : '✅ Подтвердить и создать аккаунт'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* 🔐 МОДАЛЬНОЕ ОКНО «ЗАБЫЛИ ПАРОЛЬ?» С ГЛАЗИКОМ И ТРЕБОВАНИЯМИ */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '440px', background: '#ffffff', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound color="var(--pk-primary)" size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Сброс пароля</h3>
              </div>
              <button onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendForgotOtp}>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Укажите адрес электронной почты вашего аккаунта. Мы отправим вам 6-значный OTP-код для восстановления доступа.
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Ваша электронная почта</label>
                  <input type="email" className="form-control" placeholder="supplier@example.com" value={forgotForm.email} onChange={e => setForgotForm(p => ({ ...p, email: e.target.value }))} required />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={isLoading}>
                  {isLoading ? 'Отправка...' : '📩 Отправить код сброса пароля'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>OTP-код из письма</label>
                  <input 
                    type="text" 
                    maxLength={6} 
                    className="form-control" 
                    style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '1.35rem', fontWeight: 800, fontFamily: 'monospace', maxWidth: '200px', margin: '0 auto' }} 
                    placeholder="123456" 
                    value={forgotForm.otp_code} 
                    onChange={e => setForgotForm(p => ({ ...p, otp_code: e.target.value.replace(/\D/g, '') }))} 
                    required 
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: 0 }}>Новый пароль</label>
                    <button 
                      type="button" 
                      onClick={handleGenerateForgotPassword}
                      style={{ background: 'none', border: 'none', color: 'var(--pk-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', padding: 0 }}
                    >
                      <Sparkles size={14} /> Сгенерировать
                    </button>
                  </div>
                  <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                    <input 
                      type={showForgotNewPassword ? "text" : "password"} 
                      className="form-control" 
                      placeholder="Новый пароль" 
                      value={forgotForm.new_password} 
                      onChange={e => setForgotForm(p => ({ ...p, new_password: e.target.value }))} 
                      required 
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      title={showForgotNewPassword ? "Скрыть пароль" : "Показать пароль"}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                    >
                      {showForgotNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Поле повтора пароля */}
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Подтвердите новый пароль</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showForgotConfirmPassword ? "text" : "password"} 
                      className="form-control" 
                      placeholder="Повторите новый пароль" 
                      value={forgotForm.confirm_password} 
                      onChange={e => setForgotForm(p => ({ ...p, confirm_password: e.target.value }))} 
                      required 
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                      title={showForgotConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                    >
                      {showForgotConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Требования к новому паролю и совпадение */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.75rem', marginTop: '0.65rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: isForgotLengthValid ? '#16a34a' : '#94a3b8', fontWeight: isForgotLengthValid ? 700 : 400 }}>
                      {isForgotLengthValid ? '✓' : '○'} Мин. 8 символов
                    </span>
                    <span style={{ color: (isForgotHasLetters && isForgotHasDigits) ? '#16a34a' : '#94a3b8', fontWeight: (isForgotHasLetters && isForgotHasDigits) ? 700 : 400 }}>
                      {(isForgotHasLetters && isForgotHasDigits) ? '✓' : '○'} Буквы и цифры
                    </span>
                    <span style={{ color: isForgotMatch ? '#16a34a' : '#94a3b8', fontWeight: isForgotMatch ? 700 : 400 }}>
                      {isForgotMatch ? '✓' : '○'} Совпадение паролей
                    </span>
                  </div>
                </div>


                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setForgotStep(1)} style={{ flex: 1, justifyContent: 'center' }}>
                    Назад
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    disabled={forgotCooldown > 0 || isLoading} 
                    onClick={handleSendForgotOtp}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {forgotCooldown > 0 ? `${forgotCooldown} сек` : 'Повторить'}
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }} disabled={isLoading}>
                  {isLoading ? 'Сохранение...' : '💾 Сохранить новый пароль'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
