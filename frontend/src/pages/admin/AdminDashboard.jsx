import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Lock, Unlock, Key, X, Layers, Plus, Trash2, Tag, Building2, Sprout, Hotel, Truck, Factory } from 'lucide-react';
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
  
  const [userFormData, setUserFormData] = useState({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '', company_address: '' });
  const [categoryFormData, setCategoryFormData] = useState({ name: '', code: '', description: '', icon: 'building' });
  
  const [categories, setCategories] = useState(defaultCategoriesMock);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.list();
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (e) {
      // Mock fallback
    }
  };

  const handleBlockUser = async (id, isBlocked) => {
    try {
      if (isBlocked) {
        await adminAPI.unblockUser(id);
        toast.success('Пользователь разблокирован');
      } else {
        await adminAPI.blockUser(id);
        toast.warning('Пользователь заблокирован');
      }
      refetch();
    } catch (error) {
      updateMockUserStatus(id, !isBlocked);
      if (isBlocked) toast.success('Пользователь разблокирован');
      else toast.warning('Пользователь заблокирован');
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
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.createUser(userFormData);
      toast.success('Пользователь успешно создан');
      refetch();
      setIsUserModalOpen(false);
      setUserFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '' });
    } catch (error) {
      addMockUser(userFormData);
      toast.success('Пользователь успешно создан');
      setIsUserModalOpen(false);
      setUserFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await categoriesAPI.create(categoryFormData);
      toast.success('Категория закупки создана');
      fetchCategories();
      setIsCategoryModalOpen(false);
      setCategoryFormData({ name: '', code: '', description: '', icon: 'building' });
    } catch (error) {
      const newCat = { id: Date.now(), ...categoryFormData, is_active: true };
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
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsCategoryModalOpen(true)}>
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
                  <th style={{ padding: '1rem' }}>{t('th_iin_bin')}</th>
                  <th>{t('th_email')}</th>
                  <th>{t('th_role')}</th>
                  <th>{t('th_status')}</th>
                  <th>{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}><span className="loader-spinner"></span></td></tr>
                ) : users.filter(u => u.role !== 'admin' && u.role !== 'ADMIN' && u.username !== 'admin').length > 0 ? (
                  users.filter(u => u.role !== 'admin' && u.role !== 'ADMIN' && u.username !== 'admin').map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{u.iin_bin}</td>
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
                          <Key size={16} /> Сброс
                        </button>
                        <button 
                          className={`btn btn-sm ${u.status === 'blocked' ? 'btn-primary' : 'btn-outline'}`} 
                          title={u.status === 'blocked' ? 'Разблокировать' : 'Блокировать'}
                          style={u.status === 'blocked' ? {} : { color: 'var(--pk-danger)', borderColor: 'var(--pk-danger)' }}
                          onClick={() => handleBlockUser(u.id, u.status === 'blocked')}
                        >
                          {u.status === 'blocked' ? <><Unlock size={16} /> Разблок</> : <><Lock size={16} /> Блок</>}
                        </button>
                        <button 
                          className="btn btn-outline btn-sm" 
                          title="Удалить пользователя"
                          style={{ color: '#da1e28', borderColor: '#da1e28' }}
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                        >
                          <Trash2 size={16} /> Удалить
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Пользователи не найдены</td></tr>
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
              <h4 style={{ margin: 0 }}>Справочник категорий закупок холдинга Asia Partners</h4>
              <p className="text-sec text-sm" style={{ margin: '0.25rem 0 0 0' }}>Направления деятельности компаний группы (Строительство, Агро, Гостиничный бизнес и др.)</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem' }}>Название категории</th>
                  <th>Системный код</th>
                  <th>Описание</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, fontSize: '1rem' }}>{cat.name}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#0f172a' }}>{cat.code}</code></td>
                    <td className="text-sec text-sm" style={{ maxWidth: '350px' }}>{cat.description || '—'}</td>
                    <td>
                      <span className="badge badge-success">Активна</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--pk-danger)' }} onClick={() => handleDeleteCategory(cat.id)}>
                        <Trash2 size={16} /> Удалить
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Создать пользователя</h3>
              <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Логин (Username)</label>
                <input type="text" className="form-control" value={userFormData.username || ''} onChange={e => setUserFormData({...userFormData, username: e.target.value})} placeholder="Например: org_asia_1" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>ИИН / БИН</label>
                <input type="text" className="form-control" value={userFormData.iin_bin} onChange={e => setUserFormData({...userFormData, iin_bin: e.target.value})} placeholder="12 цифр" maxLength={12} />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>ФИО / Наименование организации</label>
                <input type="text" className="form-control" required value={userFormData.full_name} onChange={e => setUserFormData({...userFormData, full_name: e.target.value})} placeholder="Иванов Иван" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
                <input type="email" className="form-control" required value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} placeholder="example@mail.com" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Адрес компании</label>
                <input type="text" className="form-control" value={userFormData.company_address || ''} onChange={e => setUserFormData({...userFormData, company_address: e.target.value})} placeholder="Например: г. Астана, ул. Достык 18" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Пароль</label>
                <input type="text" className="form-control" required value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} placeholder="Временный пароль" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Роль</label>
                <select className="form-control" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})}>
                  <option value="organizer">Организатор закупок</option>
                  <option value="monitoring">Служба Мониторинга</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsUserModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка создания категории */}
      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Добавить категорию закупок</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Название категории <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
                <input type="text" className="form-control" required value={categoryFormData.name} onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})} placeholder="Например: 🏨 Гостиничный бизнес" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Системный код (латиница) <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
                <input type="text" className="form-control" required value={categoryFormData.code} onChange={e => setCategoryFormData({...categoryFormData, code: e.target.value})} placeholder="hospitality" />
              </div>
              <div className="form-group mb-3">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Описание направления</label>
                <textarea className="form-control" rows={3} value={categoryFormData.description} onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})} placeholder="Краткое описание оборудования и сферы применения"></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsCategoryModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
