import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Lock, Unlock, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdmin } from '../../hooks/useAdmin';
import { adminAPI } from '../../api';

const AdminDashboard = () => {
  const { users, stats, loading, refetch, addMockUser, updateMockUserStatus } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);


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
      if (isBlocked) toast.success('Пользователь разблокирован (Mock)');
      else toast.warning('Пользователь заблокирован (Mock)');
    }
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm('Вы уверены, что хотите сбросить пароль этому пользователю?')) return;
    try {
      const res = await adminAPI.resetPassword(id);
      alert(`Новый временный пароль: ${res.data.temp_password}\nОбязательно передайте его пользователю!`);
    } catch (e) {
      alert(`Mock сброс.\nНовый временный пароль: Tmp${Math.floor(Math.random()*10000)}!\nОбязательно передайте его пользователю!`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminAPI.createUser(formData);
      toast.success('Пользователь успешно создан');
      refetch();
      setIsModalOpen(false);
      setFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '' });
    } catch (error) {
      addMockUser(formData);
      toast.success('Пользователь успешно создан (Mock)');
      setIsModalOpen(false);
      setFormData({ iin_bin: '', full_name: '', email: '', role: 'organizer', password: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck /> Панель Администратора</h2>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} /> Создать УЗ
        </button>
      </div>

      {stats && (
        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">Всего тендеров</div>
            <div className="stat-value text-primary" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_tenders}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">Пользователей</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_users}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">Компаний</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_companies}</div>
          </div>
          <div className="stat-card card">
            <div className="stat-title text-sec text-sm">Подано заявок</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.total_bids}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h4 style={{ marginBottom: '1rem' }}>Управление учетными записями</h4>
        <div className="table-wrapper">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem' }}>БИН/ИИН</th>
                <th>ФИО / Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}><span className="loader-spinner"></span></td></tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{u.iin_bin}</td>
                    <td>
                      <div>{u.full_name}</div>
                      <div className="text-sm text-sec">{u.email}</div>
                    </td>
                    <td>{u.role}</td>
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

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Создать пользователя</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)' }}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>ИИН / БИН</label>
                <input type="text" className="form-control" required value={formData.iin_bin} onChange={e => setFormData({...formData, iin_bin: e.target.value})} placeholder="Введите 12 цифр" minLength={12} maxLength={12} />
              </div>
              <div className="form-group">
                <label>ФИО / Наименование организации</label>
                <input type="text" className="form-control" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Иванов Иван / ТОО Пример" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@mail.com" />
              </div>
              <div className="form-group">
                <label>Пароль</label>
                <input type="text" className="form-control" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Временный пароль для входа" />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select className="form-control" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="organizer">Закупщик (Организатор)</option>
                  <option value="lawyer">Юрист</option>
                  <option value="commission">Член комиссии</option>
                  <option value="supplier">Поставщик</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
