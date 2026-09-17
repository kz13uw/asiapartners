import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

const AdminUserEditModal = ({ userId, isOpen, onClose, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    iin_bin: '',
    email: '',
    role: '',
    status: '',
    created_at: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUser();
    }
  }, [isOpen, userId]);

  const loadUser = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getUser(userId);
      const user = res.data;
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        iin_bin: user.iin_bin || '',
        email: user.email || '',
        role: user.role || '',
        status: user.status || '',
        created_at: user.created_at || ''
      });
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при загрузке данных пользователя');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminAPI.updateUser(userId, {
        full_name: formData.full_name,
        phone: formData.phone
      });
      toast.success('Данные пользователя успешно обновлены');
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Ошибка при обновлении пользователя');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '1.5rem 1rem', overflowY: 'auto' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Профиль пользователя</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)' }}>
            &times;
          </button>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Роль в системе</label>
              <input type="text" className="form-control" value={formData.role} disabled />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>БИН / ИИН (недоступно для изменения)</label>
              <input type="text" className="form-control" value={formData.iin_bin} disabled />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Почта (недоступно для изменения)</label>
              <input type="email" className="form-control" value={formData.email} disabled />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Наименование организации / ФИО</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Телефон</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Отмена</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminUserEditModal;
