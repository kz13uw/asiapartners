import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import EcpModal from '../components/EcpModal';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginEds, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('eds');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuthStore();
  const [showEdsModal, setShowEdsModal] = useState(false);

  const handleEdsSuccess = async (cmsBase64) => {
    setIsLoading(true);
    setShowEdsModal(false);
    try {
      await loginEds(cmsBase64);
      toast.success('Авторизация успешна!');
      navigate('/supplier/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password || 'demo');
      toast.success('Успешный вход!');
      navigate(email.includes('admin') ? '/admin/dashboard' : '/organizer/dashboard');
    } catch (e) {
      toast.error('Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('demo');
    setTimeout(() => {
      login(roleEmail, 'demo').then(() => {
        toast.success('Успешный вход!');
        if (roleEmail.includes('admin')) navigate('/admin/dashboard');
        else if (roleEmail.includes('supplier')) navigate('/supplier/dashboard');
        else navigate('/organizer/dashboard');
      });
    }, 500);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
      <div className="card glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '0' }}>
        
        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--pk-border)' }}>
          <button 
            onClick={() => setActiveTab('eds')}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'eds' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'eds' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'eds' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Поставщик (ЭЦП)
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            style={{ flex: 1, padding: '1.25rem 1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'staff' ? '3px solid var(--pk-primary)' : '3px solid transparent', color: activeTab === 'staff' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'staff' ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Служебный вход
          </button>
        </div>

        <div style={{ padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <ShieldCheck size={48} color="var(--pk-primary)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{activeTab === 'eds' ? 'Вход по ЭЦП' : 'Авторизация'}</h2>
            <p className="text-sec" style={{ fontSize: '0.9rem' }}>
              {activeTab === 'eds' ? 'Для входа в Портал Закупок выберите ваш сертификат (ключ AUTH).' : 'Введите корпоративный логин и пароль.'}
            </p>
          </div>

          {activeTab === 'eds' ? (
            <>
              <div 
                className="file-upload-box" 
                onClick={() => setShowEdsModal(true)}
                style={{ 
                  border: '2px dashed var(--pk-border)', borderRadius: '8px', padding: '2rem',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  pointerEvents: isLoading ? 'none' : 'auto', opacity: isLoading ? 0.7 : 1
                }}
              >
                <HardDrive size={32} color="var(--pk-primary)" style={{ marginBottom: '1rem' }} />
                <div><strong>{isLoading ? 'Проверка...' : 'Выбрать сертификат'}</strong></div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <p className="text-sec" style={{ fontSize: '0.85rem' }}>* Профиль будет создан автоматически при первом входе.</p>
              </div>
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--pk-text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>Демонстрационная заглушка:</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDemoLogin('supplier@asia.kz')} style={{ width: '100%', justifyContent: 'center' }}>
                  Войти как Поставщик (Без ЭЦП)
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleStaffLogin}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="org@company.kz" required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Пароль</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </button>
              
              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--pk-text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>Демонстрационные заглушки (Быстрый вход):</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDemoLogin('org@asia.kz')} style={{ width: '100%', justifyContent: 'center' }}>
                    Войти как Организатор
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDemoLogin('admin@asia.kz')} style={{ width: '100%', justifyContent: 'center' }}>
                    Войти как Администратор
                  </button>
                </div>
              </div>
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
