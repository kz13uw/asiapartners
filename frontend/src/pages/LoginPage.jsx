import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/useLanguageStore';
import EcpModal from '../components/EcpModal';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, loginEds } = useAuthStore();

  const [activeTab, setActiveTab] = useState('eds'); // 'eds' или 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdsSuccess = async (cmsBase64, extraFields) => {
    setIsLoading(true);
    try {
      await loginEds(cmsBase64, extraFields);
      toast.success('Успешная авторизация по ЭЦП!');
      navigate('/supplier/dashboard');
    } catch (e) {
      toast.error('Ошибка входа по ЭЦП. Проверьте ключ или соединение.');
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
      toast.error('Неверный логин или пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="card glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '0', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--pk-border)' }}>
          <button 
            onClick={() => setActiveTab('eds')}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'eds' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'eds' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'eds' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {t('eds_login_tab')}
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'staff' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'staff' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'staff' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {t('staff_login_tab')}
          </button>
        </div>

        <div style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <ShieldCheck size={48} color="var(--pk-primary)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeTab === 'eds' ? t('eds_login_title') : t('staff_login_title')}</h2>
            <p className="text-sec" style={{ fontSize: '0.9rem' }}>
              {activeTab === 'eds' ? t('eds_login_desc') : t('staff_login_desc')}
            </p>
          </div>

          {activeTab === 'eds' ? (
            <div 
              className="file-upload-box" 
              onClick={() => setShowEdsModal(true)}
              style={{ 
                border: '2px dashed var(--pk-primary)', backgroundColor: 'var(--pk-primary-light)', borderRadius: '12px', padding: '2rem',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? 0.7 : 1
              }}
            >
              <HardDrive size={36} color="var(--pk-primary)" style={{ marginBottom: '1rem' }} />
              <div><strong style={{ fontSize: '1.05rem', color: 'var(--pk-primary)' }}>{isLoading ? 'Загрузка...' : t('select_cert')}</strong></div>
            </div>
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
        onSign={handleEdsSuccess}
        docTitle="Авторизация на портале"
        isAuth={true}
      />
    </div>
  );
};

export default LoginPage;
