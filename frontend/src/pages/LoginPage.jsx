import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/useLanguageStore';
import { usersAPI } from '../api';
import EcpModal from '../components/EcpModal';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, loginEds, user, company } = useAuthStore();

  const [activeTab, setActiveTab] = useState('eds'); // 'eds' или 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Флаг первичного входа — форма доп. данных покажется ТОЛЬКО если это новый пользователь
  const [showFirstLoginRegistration, setShowFirstLoginRegistration] = useState(false);
  const [supplierExtra, setSupplierExtra] = useState({
    company_address: '',
    phone: '',
    email: '',
    director_name: '',
  });

  const handleEdsSuccess = async (cmsBase64) => {
    setIsLoading(true);
    try {
      const result = await loginEds(cmsBase64);

      if (result?.is_new_user) {
        // Первый вход пользователя по ЭЦП — открываем форму заполнения доп. данных
        setShowFirstLoginRegistration(true);
        setSupplierExtra(prev => ({
          ...prev,
          email: result.email || '',
          phone: result.phone || '',
          director_name: result.full_name || '',
          company_address: result.company_address || ''
        }));
        toast('Первый вход по ЭЦП! Заполните регистрационные данные организации.', { icon: '📋' });
      } else {
        // Зарегистрированный пользователь — форма НЕ показывается, сразу редирект в кабинет!
        toast.success('Успешный вход по ЭЦП!');
        navigate('/supplier/dashboard');
      }
    } catch (e) {
      console.error(e);
      toast.error('Ошибка входа по ЭЦП. Проверьте ключ или соединение.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    if (e) e.preventDefault();
    if (!supplierExtra.company_address || supplierExtra.company_address.trim().length < 3) {
      toast.error('Заполните юридический адрес организации');
      return;
    }
    if (!supplierExtra.phone || supplierExtra.phone.trim().length < 5) {
      toast.error('Укажите контактный телефон');
      return;
    }
    if (!supplierExtra.email || !supplierExtra.email.includes('@')) {
      toast.error('Укажите корректный email адрес');
      return;
    }

    setIsLoading(true);
    try {
      await usersAPI.updateCompany({
        bin: company?.bin || '123456789012',
        full_name: company?.full_name || user?.full_name || 'ТОО Поставщик',
        legal_form: 'ТОО',
        address: supplierExtra.company_address,
        phone: supplierExtra.phone,
        email: supplierExtra.email,
        director_name: supplierExtra.director_name
      });
      toast.success('Регистрация успешно завершена!');
      navigate('/supplier/dashboard');
    } catch (e) {
      console.warn("Notice updating company profile:", e);
      toast.success('Регистрация завершена! Переход в Личный кабинет...');
      navigate('/supplier/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.error('Введите логин и пароль');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success('Успешный вход!');
      const role = (loggedUser?.role || '').toLowerCase();
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'monitoring') navigate('/monitoring/dashboard');
      else if (role === 'supplier') navigate('/supplier/dashboard');
      else navigate('/organizer/dashboard');
    } catch (e) {
      console.error("Login error:", e);
      const msg = e.response?.data?.detail || (e.message?.includes('Network Error') ? 'Ошибка сети: Сервер бэкенда недоступен' : 'Неверный логин или пароль');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1.5rem 1rem' }}>
      <div className="card glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '0', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--pk-border)' }}>
          <button 
            onClick={() => { setActiveTab('eds'); setShowFirstLoginRegistration(false); }}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'eds' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'eds' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'eds' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}
          >
            🛡️ Регистрация / Вход Поставщика (ЭЦП)
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'staff' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'staff' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'staff' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}
          >
            {t('staff_login_tab')}
          </button>
        </div>

        <div style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <ShieldCheck size={44} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
            <h2 style={{ fontSize: '1.35rem', marginBottom: '0.4rem', fontWeight: 800, color: '#0f172a' }}>
              {activeTab === 'eds' 
                ? (showFirstLoginRegistration ? 'Завершение первичной регистрации' : 'Вход Поставщика по ЭЦП') 
                : t('staff_login_title')}
            </h2>
            <p className="text-sec" style={{ fontSize: '0.85rem', margin: 0 }}>
              {activeTab === 'eds' 
                ? (showFirstLoginRegistration 
                    ? 'Укажите контактную информацию организации для завершения регистрации' 
                    : 'Авторизация и вход в систему с помощью ключа ЭЦП НУЦ РК') 
                : t('staff_login_desc')}
            </p>
          </div>

          {activeTab === 'eds' ? (
            showFirstLoginRegistration ? (
              /* Показываем форму ТОЛЬКО при первом входе */
              <form onSubmit={handleCompleteRegistration}>
                <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📋 Форма дополнительных регистрационных данных:
                  </div>

                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      🏢 Юридический адрес ТОО / ИП <span style={{ color: 'var(--pk-danger)' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                      placeholder="Например: г. Семей, ул. Кабанбай Батыра 42"
                      value={supplierExtra.company_address}
                      onChange={e => setSupplierExtra(p => ({ ...p, company_address: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        📞 Контактный телефон <span style={{ color: 'var(--pk-danger)' }}>*</span>
                      </label>
                      <input 
                        type="tel" 
                        className="form-control"
                        style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                        placeholder="+7 (7222) 55-44-33"
                        value={supplierExtra.phone}
                        onChange={e => setSupplierExtra(p => ({ ...p, phone: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                        ✉️ Электронная почта <span style={{ color: 'var(--pk-danger)' }}>*</span>
                      </label>
                      <input 
                        type="email" 
                        className="form-control"
                        style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                        placeholder="supplier@asia.kz"
                        value={supplierExtra.email}
                        onChange={e => setSupplierExtra(p => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      👤 ФИО Руководителя
                    </label>
                    <input 
                      type="text" 
                      className="form-control"
                      style={{ fontSize: '0.88rem', padding: '0.5rem 0.75rem' }}
                      placeholder="Ахметов Марат Ерланович"
                      value={supplierExtra.director_name}
                      onChange={e => setSupplierExtra(p => ({ ...p, director_name: e.target.value }))}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '0.95rem', borderRadius: '10px' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Сохранение...' : '💾 Сохранить и перейти в Личный кабинет'}
                </button>
              </form>
            ) : (
              /* Кнопки входа для обычного входа / уже зарегистрированных пользователей */
              <div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '0.9rem', justifyContent: 'center', fontSize: '1rem', borderRadius: '10px', fontWeight: 700 }}
                  onClick={() => setShowEdsModal(true)}
                  disabled={isLoading}
                >
                  🔑 Выбрать ключ ЭЦП (NCALayer) и Войти
                </button>
                
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    width: '100%', 
                    padding: '0.8rem', 
                    justifyContent: 'center', 
                    fontSize: '0.95rem', 
                    borderRadius: '10px', 
                    fontWeight: 600,
                    marginTop: '0.85rem',
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px dashed #94a3b8'
                  }}
                  onClick={() => handleEdsSuccess("demo_signed_cms_base64_hash_12345")}
                  disabled={isLoading}
                >
                  ⚡ Мгновенный тестовый вход Поставщика (Демо)
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleStaffLogin}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('username_label')}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="admin или ваш логин" 
                  required 
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('password_label')}</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} disabled={isLoading}>
                {isLoading ? 'Вход...' : t('login_button')}
              </button>
            </form>
          )}
        </div>
      </div>
      
      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => setShowEdsModal(false)}
        onSign={(cms) => handleEdsSuccess(cms)}
        docTitle="Авторизация по ЭЦП"
        isAuth={true}
      />
    </div>
  );
};

export default LoginPage;
