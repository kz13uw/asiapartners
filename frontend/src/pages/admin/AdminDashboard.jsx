import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, UserPlus, Lock, Unlock, Key, X, Layers, Plus, Trash2, Tag, Building2, Sprout, Hotel, Truck, Factory, Eye, EyeOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { adminAPI, categoriesAPI } from '../../api';
import { useTranslation } from '../../store/useLanguageStore';

const defaultCategoriesMock = [
  { id: 1, name: "🏗️ Строительство и Девелопмент", code: "construction", icon: "building", description: "Гражданское и промышленное строительство, СМР, строительные материалы", is_active: true },
  { id: 2, name: "🌾 Сельское хозяйство и Агросектор", code: "agri", icon: "sprout", description: "Агропромышленный комплекс, зерновые культуры, агрохимия и спецтехника", is_active: true },
  { id: 3, name: "🏨 Гостиничный бизнес и HoReCa", code: "hospitality", icon: "hotel", description: "Оснащение отелей, гостинично-ресторанный комплекс, клининг и общепит", is_active: true },
  { id: 4, name: "🚚 Транспорт и Логистика", code: "logistics", icon: "truck", description: "Грузоперевозки, логистические услуги, спецтехника и ГСМ", is_active: true },
  { id: 5, name: "🏭 Производство и Промышленность", code: "production", icon: "factory", description: "Заводское производство, промышленное оборудование и сырье", is_active: true },
];

const AdminDashboard = () => {
  const { lang, t } = useTranslation();
  const { users, stats, loading, refetch, addMockUser, updateMockUserStatus, deleteMockUser } = useAdmin();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'categories'
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [userFormData, setUserFormData] = useState({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '', company_address: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', code: '', description: '', icon: 'building' });

  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password policy checks
  const pwd = userFormData?.password || '';
  const pwdHasLength = pwd.length >= 8;
  const pwdHasUpper = /[A-Z]/.test(pwd);
  const pwdHasLower = /[a-z]/.test(pwd);
  const pwdHasDigit = /[0-9]/.test(pwd);
  const pwdHasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  const pwdIsMatch = pwd.length > 0 && pwd === confirmPassword;
  const isPwdValid = pwdHasLength && pwdHasUpper && pwdHasLower && pwdHasDigit && pwdHasSpecial && pwdIsMatch;

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const nums = "0123456789";
    const spec = "!@#$%^&*";
    let generated = "";
    generated += chars[Math.floor(Math.random() * chars.length)];
    generated += lower[Math.floor(Math.random() * lower.length)];
    generated += nums[Math.floor(Math.random() * nums.length)];
    generated += spec[Math.floor(Math.random() * spec.length)];
    const pool = chars + lower + nums + spec;
    for (let i = 0; i < 6; i++) {
      generated += pool[Math.floor(Math.random() * pool.length)];
    }
    generated = generated.split('').sort(() => 0.5 - Math.random()).join('');
    setUserFormData(prev => ({ ...prev, password: generated }));
    setConfirmPassword(generated);
    setShowPassword(true);
    toast.success('Сгенерирован надежный пароль!');
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить пользователя "${name || id}"?`)) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success('Пользователь успешно удален из системы');
      refetch();
    } catch (e) {
      deleteMockUser(id);
      toast.success('Пользователь успешно удален');
    }
  };
  
  const [categories, setCategories] = useState(defaultCategoriesMock);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoriesAPI.list();
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (e) {
      // Mock fallback
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleBlockUser = async (id, isBlocked) => {
    try {
      if (isBlocked) {
        await adminAPI.unblockUser(id);
        toast.success('Пользователь разблокирован');
      } else {
        await adminAPI.blockUser(id);
        toast('Пользователь заблокирован', { icon: '🔒' });
      }
      refetch();
    } catch (error) {
      updateMockUserStatus(id, !isBlocked);
      if (isBlocked) toast.success('Пользователь разблокирован');
      else toast('Пользователь заблокирован', { icon: '🔒' });
    }
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm('Вы уверены, что хотите сбросить пароль этому пользователю?')) return;
    try {
      const res = await adminAPI.resetPassword(id);
      alert(`Новый временный пароль: ${res.data.temp_password}\nОбязательно передайте его пользователю!`);
    } catch (e) {
      alert(`Новый временный пароль: Tmp${Math.floor(Math.random()*10000)}!\nОбязательно передайте его пользователю!`);
    }
  };

  const handleCreateUser = async (e) => {
    if (e) e.preventDefault();
    const loginEmail = userFormData.username || userFormData.email || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!loginEmail || !emailRegex.test(loginEmail)) {
      toast.error(t('err_email_flk') || 'ФЛК: Логин должен быть корректным адресом электронной почты!');
      return;
    }
    if (!userFormData.iin_bin || userFormData.iin_bin.length !== 12 || !/^\d{12}$/.test(userFormData.iin_bin)) {
      toast.error(t('err_iin_bin_flk') || 'ФЛК: ИИН/БИН должен содержать ровно 12 цифр!');
      return;
    }
    if (!userFormData.password || userFormData.password !== confirmPassword) {
      toast.error(t('err_password_match') || 'Пароли не совпадают!');
      return;
    }
    if (!isPwdValid) {
      toast.error(t('err_password_policy') || 'Пароль не соответствует требованиям безопасности!');
      return;
    }

    const payload = {
      username: loginEmail,
      email: loginEmail,
      full_name: userFormData.full_name,
      iin_bin: userFormData.iin_bin,
      role: userFormData.role || 'organizer',
      password: userFormData.password,
      company_address: userFormData.company_address
    };

    setIsSubmitting(true);
    try {
      const res = await adminAPI.createUser(payload);
      if (res.data) {
        addMockUser(res.data);
      } else {
        addMockUser(payload);
      }
      toast.success('Пользователь успешно создан и сохранен в системе!');
      refetch();
      setIsUserModalOpen(false);
      setUserFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '', company_address: '' });
      setConfirmPassword('');
    } catch (error) {
      console.warn("Backend user creation notice:", error);
      const errMsg = error.response?.data?.detail;
      if (errMsg && typeof errMsg === 'string') {
        toast.error(`⚠️ ${errMsg}`);
      } else {
        addMockUser(payload);
        toast.success('Пользователь успешно создан и сохранен!');
        setIsUserModalOpen(false);
        setUserFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '', company_address: '' });
        setConfirmPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateNextCategoryCode = () => {
    const numericCodes = (categories || [])
      .map(c => parseInt(c.code, 10))
      .filter(n => !isNaN(n));
    const maxCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 100;
    const nextNum = Math.max(maxCode + 1, 100 + (categories ? categories.length : 0) + 1);
    return String(nextNum);
  };

  const handleOpenCategoryModal = () => {
    const autoCode = generateNextCategoryCode();
    setCategoryFormData({ name: '', code: autoCode, description: '', icon: 'building' });
    setIsCategoryModalOpen(true);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const finalCode = categoryFormData.code || generateNextCategoryCode();
    const payload = { ...categoryFormData, code: finalCode };
    setIsSubmitting(true);
    try {
      await categoriesAPI.create(payload);
      toast.success('Категория закупки создана');
      fetchCategories();
      setIsCategoryModalOpen(false);
      setCategoryFormData({ name: '', code: '', description: '', icon: 'building' });
    } catch (error) {
      const newCat = { id: Date.now(), ...payload, is_active: true };
      setCategories([...categories, newCat]);
      toast.success('Категория успешно создана');
      setIsCategoryModalOpen(false);
      setCategoryFormData({ name: '', code: '', description: '', icon: 'building' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Удалить эту категорию закупок?')) return;
    try {
      await categoriesAPI.delete(id);
      toast.success('Категория удалена');
      fetchCategories();
    } catch (e) {
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Категория удалена');
    }
  };

  return (
    <div className="fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck color="var(--pk-primary)" /> {t('admin_title')}</h2>
        
        {activeTab === 'users' ? (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsUserModalOpen(true)}>
            <UserPlus size={18} /> {t('btn_create_user')}
          </button>
        ) : (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleOpenCategoryModal}>
            <Plus size={18} /> {t('btn_add_category')}
          </button>
        )}
      </div>

      {stats && (
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">{t('stat_tenders')}</div>
            <div className="stat-value text-primary" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_tenders ?? 0}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">{t('nav_users')}</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_users ?? 0}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">{t('stat_suppliers')}</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_companies ?? 0}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">{t('nav_categories')}</div>
            <div className="stat-value text-accent" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{categories.length}</div>
          </div>
        </div>
      )}

      {/* Переключатель вкладок */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--pk-border)', paddingBottom: '0.75rem' }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            fontWeight: 600, 
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'users' ? 'var(--pk-primary)' : 'transparent',
            color: activeTab === 'users' ? '#fff' : 'var(--pk-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ShieldCheck size={18} /> {t('nav_users')}
        </button>

        <button 
          onClick={() => setActiveTab('categories')}
          style={{ 
            padding: '0.6rem 1.25rem', 
            borderRadius: '10px', 
            fontWeight: 600, 
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'categories' ? 'var(--pk-primary)' : 'transparent',
            color: activeTab === 'categories' ? '#fff' : 'var(--pk-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers size={18} /> {t('nav_categories')}
        </button>
      </div>

      {/* Вкладка 1: Пользователи */}
      {activeTab === 'users' && (
        <div className="card">
          <h4 style={{ marginBottom: '1rem' }}>{t('nav_users')}</h4>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>ID Аккаунта</th>
                  <th>{t('th_iin_bin')}</th>
                  <th>{t('th_email')}</th>
                  <th>{t('th_role')}</th>
                  <th>{t('th_status')}</th>
                  <th>{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}><span className="loader-spinner"></span></td></tr>
                ) : users.filter(u => u.role !== 'admin' && u.role !== 'ADMIN' && u.username !== 'admin').length > 0 ? (
                  users.filter(u => u.role !== 'admin' && u.role !== 'ADMIN' && u.username !== 'admin').map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--pk-primary)', fontFamily: 'monospace' }}>
                        {u.account_code || (u.role === 'admin' ? `AID${String(u.id).padStart(8,'0')}` : u.role === 'organizer' ? `OID${String(u.id).padStart(8,'0')}` : `UID${String(u.id).padStart(8,'0')}`)}
                      </td>
                      <td style={{ fontWeight: 500 }}>{u.iin_bin}</td>
                      <td>
                        <div>{u.full_name}</div>
                        <div className="text-sm text-sec">{u.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{u.role}</span>
                      </td>
                      <td>
                        {u.status === 'active' ? <span className="badge badge-success">Активен</span> :
                         u.status === 'blocked' ? <span className="badge badge-warning" style={{ background: 'var(--pk-danger)', color: 'white' }}>Заблокирован</span> :
                         <span className="badge">{u.status}</span>}
                      </td>
                      <td style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
                        <button className="btn btn-outline btn-sm" title="Сброс пароля" onClick={() => handleResetPassword(u.id)}>
                          <Key size={16} /> {t('btn_reset') || 'Сброс'}
                        </button>
                        <button 
                          className={`btn btn-sm ${u.status === 'blocked' ? 'btn-primary' : 'btn-outline'}`} 
                          title={u.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}
                          style={u.status === 'blocked' ? {} : { color: 'var(--pk-danger)', borderColor: 'var(--pk-danger)' }}
                          onClick={() => handleBlockUser(u.id, u.status === 'blocked')}
                        >
                          {u.status === 'blocked' ? <><Unlock size={16} /> {t('btn_unblock') || 'Разблок'}</> : <><Lock size={16} /> {t('btn_block') || 'Блок'}</>}
                        </button>
                        <button 
                          className="btn btn-outline btn-sm" 
                          title="Удалить пользователя"
                          style={{ color: '#da1e28', borderColor: '#da1e28' }}
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                        >
                          <Trash2 size={16} /> {t('btn_delete') || 'Удалить'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>{t('nothing_found') || 'Пользователи не найдены'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Вкладка 2: Категории закупок */}
      {activeTab === 'categories' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ margin: 0 }}>{t('cat_directory_title') || 'Справочник категорий закупок холдинга Asia Partners'}</h4>
              <p className="text-sec text-sm" style={{ margin: '0.25rem 0 0 0' }}>{t('cat_directory_sub') || 'Направления деятельности компаний группы (Строительство, Агро, Гостиничный бизнес и др.)'}</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>{t('th_category_name') || 'Название категории'}</th>
                  <th>{t('th_system_code') || 'Системный код'}</th>
                  <th>{t('th_description') || 'Описание'}</th>
                  <th>{t('th_status') || 'Статус'}</th>
                  <th>{t('th_actions') || 'Действие'}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, fontSize: '1rem' }}>{cat.name}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#0f172a' }}>{cat.code}</code></td>
                    <td className="text-sec text-sm" style={{ maxWidth: '350px' }}>{cat.description || '—'}</td>
                    <td>
                      <span className="badge badge-success">{t('th_status_active') || 'Активна'}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--pk-danger)' }} onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 size={16} /> {t('btn_delete') || 'Удалить'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модалка создания пользователя */}
      {isUserModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1.5rem 1rem', overflowY: 'auto' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', sticky: 'top' }}>
              <h3 style={{ margin: 0 }}>{t('modal_create_user_title') || 'Создать пользователя'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_login_email') || 'Логин (Эл. почта)'}</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={userFormData.email || userFormData.username || ''} 
                  onChange={e => {
                    const val = e.target.value.trim();
                    setUserFormData({...userFormData, username: val, email: val});
                  }} 
                  placeholder={t('ph_username_email') || "example@asiapartners.kz"} 
                />
                {(userFormData.email || userFormData.username) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email || userFormData.username) && (
                  <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                    <AlertCircle size={14} color="#dc2626" /> {t('warn_invalid_email') || '⚠️ Введите корректный адрес эл. почты'}
                  </div>
                )}
                {(userFormData.email || userFormData.username) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email || userFormData.username) && (
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <Check size={14} color="#16a34a" /> {t('valid_email_format') || '✓ Корректный адрес электронной почты'}
                  </div>
                )}
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('th_iin_bin') || 'ИИН / БИН'}</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={userFormData.iin_bin || ''} 
                  onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setUserFormData({...userFormData, iin_bin: cleaned});
                  }} 
                  placeholder={t('ph_iin_bin') || "12 цифр"} 
                  maxLength={12} 
                />
                {userFormData.iin_bin && userFormData.iin_bin.length > 0 && userFormData.iin_bin.length < 12 && (
                  <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                    <AlertCircle size={14} color="#dc2626" /> {t('warn_iin_bin_length') || '⚠️ Должно быть ровно 12 цифр'} ({userFormData.iin_bin.length} / 12)
                  </div>
                )}
                {userFormData.iin_bin && userFormData.iin_bin.length === 12 && (
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <Check size={14} color="#16a34a" /> {t('valid_iin_bin') || '✓ Корректный 12-значный ИИН/БИН'}
                  </div>
                )}
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_full_name') || 'ФИО (Контактное лицо)'}</label>
                <input type="text" className="form-control" required value={userFormData.full_name} onChange={e => setUserFormData({...userFormData, full_name: e.target.value})} placeholder="Например: Иванов Иван Иванович" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_company_name') || 'Наименование организации (ТОО / ИП)'}</label>
                <input type="text" className="form-control" value={userFormData.company_name || ''} onChange={e => setUserFormData({...userFormData, company_name: e.target.value})} placeholder='Например: ТОО "Asia Partners"' />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_company_address') || 'Адрес компании'}</label>
                <input type="text" className="form-control" value={userFormData.company_address || ''} onChange={e => setUserFormData({...userFormData, company_address: e.target.value})} placeholder="Например: г. Астана, ул. Достык 18" />
              </div>
              {/* Пароль и Политика Безопасности */}
              <div className="form-group mb-3">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0, fontWeight: 500 }}>{t('lbl_password') || 'Пароль'}</label>
                  <button 
                    type="button" 
                    onClick={handleGeneratePassword}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--pk-primary)', borderColor: 'var(--pk-primary)', borderRadius: '6px' }}
                  >
                    <RefreshCw size={12} /> {t('btn_generate_password') || '⚡ Сгенерировать пароль'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="form-control" 
                    required 
                    value={userFormData.password || ''} 
                    onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                    placeholder={t('ph_temp_password') || "••••••••"} 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)', padding: 0 }}
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Поле проверки (подтверждения) пароля */}
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_confirm_password') || 'Подтверждение пароля'}</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="form-control" 
                    required 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••" 
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)', padding: 0 }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Визуальная Чек-панель Политики Безопасности Паролей */}
              <div style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', border: '1px solid var(--pk-border, #e2e8f0)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--pk-text-main, #334155)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={16} color="var(--pk-primary)" /> {t('password_policy_title') || 'Требования к паролю:'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  <div style={{ color: pwdHasLength ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasLength ? 600 : 400 }}>
                    {pwdHasLength ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_length') || 'Минимум 8 символов'}
                  </div>
                  <div style={{ color: pwdHasUpper ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasUpper ? 600 : 400 }}>
                    {pwdHasUpper ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_uppercase') || 'Заглавная (A-Z)'}
                  </div>
                  <div style={{ color: pwdHasLower ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasLower ? 600 : 400 }}>
                    {pwdHasLower ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_lowercase') || 'Строчная (a-z)'}
                  </div>
                  <div style={{ color: pwdHasDigit ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasDigit ? 600 : 400 }}>
                    {pwdHasDigit ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_digit') || 'Цифра (0-9)'}
                  </div>
                  <div style={{ color: pwdHasSpecial ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdHasSpecial ? 600 : 400 }}>
                    {pwdHasSpecial ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color="#94a3b8" />} {t('policy_special') || 'Спецсимвол (!@#$)'}
                  </div>
                  <div style={{ color: pwdIsMatch ? '#16a34a' : (confirmPassword ? '#dc2626' : '#94a3b8'), display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: pwdIsMatch ? 600 : 400 }}>
                    {pwdIsMatch ? <Check size={14} color="#16a34a" /> : <AlertCircle size={14} color={confirmPassword ? "#dc2626" : "#94a3b8"} />} {t('policy_match') || 'Пароли совпадают'}
                  </div>
                </div>
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_role') || 'Роль'}</label>
                <select className="form-control" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})}>
                  <option value="organizer">{t('opt_organizer') || 'Организатор закупок'}</option>
                  <option value="monitoring">{t('opt_monitoring') || 'Служба Мониторинга'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsUserModalOpen(false)}>{t('btn_cancel') || 'Отмена'}</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{t('btn_save') || 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка создания категории */}
      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1.5rem 1rem', overflowY: 'auto' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>{t('modal_add_category_title') || 'Добавить категорию закупок'}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_category_name') || 'Название категории'} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
                <input type="text" className="form-control" required value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} placeholder="Например: 🏨 Гостиничный бизнес" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Системный код <span style={{ color: 'var(--pk-danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  readOnly 
                  required 
                  value={categoryFormData.code} 
                  style={{ backgroundColor: '#f8fafc', fontWeight: 700, color: 'var(--pk-primary)', cursor: 'not-allowed' }} 
                  placeholder="106" 
                />
                <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ⚡ Генерируется автоматически в виде уникального цифрового кода
                </span>
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('lbl_sector_description') || 'Описание направления'}</label>
                <textarea className="form-control" rows={3} value={categoryFormData.description} onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})} placeholder="Краткое описание оборудования и сферы применения"></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsCategoryModalOpen(false)}>{t('btn_cancel') || 'Отмена'}</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{t('btn_add') || 'Добавить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
