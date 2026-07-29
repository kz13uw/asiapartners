import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Save, User, Building, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ProfileSettings = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('Новые пароли не совпадают');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPasswords({ old: '', new: '', confirm: '' });
      toast.success('Пароль успешно изменен');
    }, 1000);
  };

  return (
    <div className="fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--pk-text-main)', marginBottom: '1.5rem' }}>Настройки профиля</h1>
      
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="var(--pk-primary)" />
          Учетные данные
        </h3>
        
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Полное имя</label>
            <input type="text" className="form-control" defaultValue={user?.full_name} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" defaultValue={user?.email} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Роль в системе</label>
            <input type="text" className="form-control" defaultValue={user?.role} disabled />
          </div>
        </div>
      </div>

      {(user?.role === 'supplier' || user?.role === 'organizer') && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} color="var(--pk-primary)" />
            Данные организации
          </h3>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">БИН</label>
              <input type="text" className="form-control" defaultValue="123456789012" disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Наименование организации</label>
              <input type="text" className="form-control" defaultValue={user?.full_name} disabled />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Юридический адрес</label>
              <input type="text" className="form-control" defaultValue="Республика Казахстан, г. Астана, ул. Достык, 1" disabled />
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--pk-text-secondary)', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            * Изменение данных организации возможно только через ЭЦП или через администратора.
          </p>
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={20} color="var(--pk-primary)" />
          Безопасность
        </h3>
        
        <form onSubmit={handlePasswordChange}>
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Старый пароль</label>
              <input 
                type="password" 
                className="form-control" 
                value={passwords.old}
                onChange={e => setPasswords({...passwords, old: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Новый пароль</label>
              <input 
                type="password" 
                className="form-control" 
                value={passwords.new}
                onChange={e => setPasswords({...passwords, new: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Подтвердите пароль</label>
              <input 
                type="password" 
                className="form-control" 
                value={passwords.confirm}
                onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'inline-flex' }}>
            <Save size={18} /> {loading ? 'Обновление...' : 'Изменить пароль'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
