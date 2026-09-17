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
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header">
          <h3>Профиль пользователя</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Роль в системе</label>
              <input type="text" className="input" value={formData.role} disabled />
            </div>
            <div className="form-group">
              <label>БИН / ИИН (недоступно для изменения)</label>
              <input type="text" className="input" value={formData.iin_bin} disabled />
            </div>
            <div className="form-group">
              <label>Почта (недоступно для изменения)</label>
              <input type="email" className="input" value={formData.email} disabled />
            </div>
            <div className="form-group">
              <label>Наименование организации / ФИО</label>
              <input 
                type="text" 
                className="input" 
                value={formData.full_name} 
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required 
              />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input 
                type="text" 
                className="input" 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
