import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../store/useLanguageStore';
import { Save, User, Building, Lock, Eye, EyeOff, RefreshCw, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usersAPI } from '../../api';

const ProfileSettings = () => {
  const { user, updateUser } = useAuthStore();
  const { t } = useTranslation();

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });

  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
      });
      if (user.role === 'supplier' || user.role === 'organizer') {
        usersAPI.myCompany().then(res => {
          setCompanyData(res.data);
        }).catch(() => {
          setCompanyData(null);
        });
      }
    }
  }, [user]);



  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Смена пароля state
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email FLC
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(profileData.email);

  // Password policy checks (supports Latin & Cyrillic)
  const pwd = passwords.new || '';
  const pwdHasLength = pwd.length >= 8;
  const pwdHasUpper = /[A-ZА-ЯЁ]/.test(pwd);
  const pwdHasLower = /[a-zа-яё]/.test(pwd);
  const pwdHasDigit = /[0-9]/.test(pwd);
  const pwdHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  const pwdIsMatch = pwd.length > 0 && pwd === passwords.confirm;
  const isPwdValid = pwdHasLength && pwdIsMatch && (pwdHasUpper || pwdHasLower) && pwdHasDigit;

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!profileData.full_name || profileData.full_name.trim().length < 2) {
      toast.error('Введите корректное полное имя!');
      return;
    }
    if (!profileData.email || !isEmailValid) {
      toast.error(t('err_email_flk') || 'ФЛК: Введите корректный адрес электронной почты!');
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await usersAPI.updateProfile({
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim(),
      });
      updateUser(res.data);
      toast.success(t('msg_profile_updated') || 'Учетные данные успешно обновлены!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Ошибка сохранения профиля');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleGeneratePassword = () => {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const nums = "0123456789";
    const spec = "!@#$%^&*";
    let generated = "";
    generated += upper[Math.floor(Math.random() * upper.length)];
    generated += lower[Math.floor(Math.random() * lower.length)];
    generated += lower[Math.floor(Math.random() * lower.length)];
    generated += nums[Math.floor(Math.random() * nums.length)];
    generated += nums[Math.floor(Math.random() * nums.length)];
    generated += spec[Math.floor(Math.random() * spec.length)];
    const pool = upper + lower + nums + spec;
    for (let i = 0; i < 4; i++) {
      generated += pool[Math.floor(Math.random() * pool.length)];
    }
    
    setPasswords(prev => ({ ...prev, new: generated, confirm: generated }));
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast.success('Сгенерирован надежный пароль!');
  };

  const handlePasswordChange = async (e) => {
    if (e) e.preventDefault();
    if (!passwords.old) {
      toast.error('Введите текущий (старый) пароль');
      return;
    }
    if (!passwords.new || passwords.new !== passwords.confirm) {
      toast.error(t('err_password_match') || 'Новые пароли не совпадают');
      return;
    }
    if (!isPwdValid) {
      toast.error(t('err_password_policy') || 'Пароль не соответствует требованиям безопасности!');
      return;
    }

    setLoadingPassword(true);
    try {
      await usersAPI.changePassword({
        old_password: passwords.old,
        new_password: passwords.new,
      });
      setPasswords({ old: '', new: '', confirm: '' });
      toast.success(t('msg_password_changed') || 'Пароль успешно изменен!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Ошибка при изменении пароля (проверьте старый пароль)');
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', marginBottom: '1.5rem' }}>
        {t('title_profile_settings') || 'Настройки профиля'}
      </h1>

      {/* Учетные данные */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="var(--pk-primary)" />
          {t('user_credentials') || 'Учетные данные'}
        </h3>

        <form onSubmit={handleSaveProfile}>
          <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('lbl_full_name') || 'ФИО (Контактное лицо)'} <span style={{ color: 'var(--pk-danger)' }}>*</span>
              </label>
              <input 
                type="text" 
                className="form-control" 
                required 
                value={profileData.full_name} 
                onChange={e => setProfileData({ ...profileData, full_name: e.target.value })} 
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('lbl_company_name') || 'Наименование организации (ТОО / ИП)'}
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={profileData.company_name || ''} 
                onChange={e => setProfileData({ ...profileData, company_name: e.target.value })} 
                placeholder='Например: ТОО "Asia Partners"'
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('th_email') || 'Email'} <span style={{ color: 'var(--pk-danger)' }}>*</span>
              </label>
              <input 
                type="email" 
                className="form-control" 
                required 
                value={profileData.email} 
                onChange={e => setProfileData({ ...profileData, email: e.target.value.trim() })} 
                placeholder="example@asiapartners.kz"
              />
              {profileData.email && !isEmailValid && (
                <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                  <AlertCircle size={14} color="#dc2626" /> {t('warn_invalid_email') || '⚠️ Введите корректный адрес эл. почты'}
                </div>
              )}
              {profileData.email && isEmailValid && (
                <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                  <Check size={14} color="#16a34a" /> {t('valid_email_format') || '✓ Корректный адрес электронной почты'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('th_role') || 'Роль в системе'}
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={user?.role || 'user'} 
                disabled 
                style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', color: 'var(--pk-text-sec)' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loadingProfile}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={18} /> {loadingProfile ? 'Сохранение...' : (t('btn_save_profile') || 'Сохранить изменения профиля')}
          </button>
        </form>
      </div>

      {/* Данные организации если есть */}
      {(user?.role === 'supplier' || user?.role === 'organizer') && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} color="var(--pk-primary)" />
            {t('org_credentials') || 'Данные организации'}
          </h3>
          
          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">{t('th_iin_bin') || 'БИН / ИИН'}</label>
              <input type="text" className="form-control" value={companyData?.bin || user?.iin_bin || 'Не указан'} disabled style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('lbl_company_name') || 'Наименование организации'}</label>
              <input type="text" className="form-control" value={companyData?.full_name || companyData?.name || user?.full_name || 'Не указано'} disabled style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('lbl_full_name') || 'ФИО Руководителя / Контактное лицо'}</label>
              <input type="text" className="form-control" value={companyData?.director_name || profileData.full_name || user?.full_name || 'Не указано'} disabled style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('lbl_company_address') || 'Юридический адрес'}</label>
              <input type="text" className="form-control" value={companyData?.address || 'Не указан'} disabled style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)' }} />
            </div>
          </div>
        </div>

      )}

      {/* Безопасность и Смена пароля */}
      <div className="card" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={20} color="var(--pk-primary)" />
            {t('security_title') || 'Безопасность'}
          </h3>
          <button 
            type="button" 
            onClick={handleGeneratePassword}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--pk-primary)', borderColor: 'var(--pk-primary)', borderRadius: '8px' }}
          >
            <RefreshCw size={14} /> {t('btn_generate_password') || '⚡ Сгенерировать пароль'}
          </button>
        </div>
        
        <form onSubmit={handlePasswordChange}>
          {/* Старый пароль */}
          <div className="form-group mb-3">
            <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
              {t('lbl_old_password') || 'Старый пароль'} <span style={{ color: 'var(--pk-danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showOldPassword ? "text" : "password"} 
                className="form-control" 
                value={passwords.old}
                onChange={e => setPasswords({ ...passwords, old: e.target.value })}
                placeholder="••••••••"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button 
                type="button" 
                onClick={() => setShowOldPassword(!showOldPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)', padding: 0 }}
              >
                {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Новый пароль и Подтверждение */}
          <div className="grid-2" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('lbl_new_password') || 'Новый пароль'} <span style={{ color: 'var(--pk-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  className="form-control" 
                  value={passwords.new}
                  onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)', padding: 0 }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                {t('lbl_confirm_new_password') || 'Подтвердите новый пароль'} <span style={{ color: 'var(--pk-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="form-control" 
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)', padding: 0 }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Визуальная Чек-панель Политики Безопасности Паролей */}
          <div style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', border: '1px solid var(--pk-border, #e2e8f0)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--pk-text-main, #334155)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} color="var(--pk-primary)" /> {t('password_policy_title') || 'Требования к паролю:'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <div style={{ color: pwdHasLength ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasLength ? 600 : 400 }}>
                {pwdHasLength ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_length') || 'Минимум 8 символов'}
              </div>
              <div style={{ color: pwdHasUpper ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasUpper ? 600 : 400 }}>
                {pwdHasUpper ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_uppercase') || 'Заглавная буква (A-Z)'}
              </div>
              <div style={{ color: pwdHasLower ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasLower ? 600 : 400 }}>
                {pwdHasLower ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_lowercase') || 'Строчная буква (a-z)'}
              </div>
              <div style={{ color: pwdHasDigit ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasDigit ? 600 : 400 }}>
                {pwdHasDigit ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_digit') || 'Цифра (0-9)'}
              </div>
              <div style={{ color: pwdHasSpecial ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasSpecial ? 600 : 400 }}>
                {pwdHasSpecial ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_special') || 'Спецсимвол (!@#$%^&*)'}
              </div>
              <div style={{ color: pwdIsMatch ? '#16a34a' : (passwords.confirm ? '#dc2626' : '#94a3b8'), display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdIsMatch ? 600 : 400 }}>
                {pwdIsMatch ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color={passwords.confirm ? "#dc2626" : "#94a3b8"} />} {t('policy_match') || 'Пароли совпадают'}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loadingPassword} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={18} /> {loadingPassword ? 'Обновление...' : (t('btn_change_password') || 'Изменить пароль')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
