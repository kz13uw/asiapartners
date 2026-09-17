import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';
import { User, Building, AlertCircle, Check } from 'lucide-react';

const AdminUserEditModal = ({ userId, isOpen, onClose, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    iin_bin: '',
    email: '',
    role: '',
    status: '',
    company_name: '',
    company_address: ''
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
        company_name: user.company_name || '',
        company_address: user.company_address || ''
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
        phone: formData.phone,
        company_name: formData.company_name,
        company_address: formData.company_address
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
      <div className="card fade-in" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Профиль пользователя</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-text-sec)' }}>
            &times;
          </button>
        </div>
        
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {/* Учетные данные */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid var(--pk-border)', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={20} color="var(--pk-primary)" />
                Учетные данные
              </h3>

              <div className="grid-2" style={{ gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    ФИО (Контактное лицо) <span style={{ color: 'var(--pk-danger)' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={formData.full_name} 
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })} 
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Email / Контакт
                  </label>
                  <input 
                    type="email" 
                    className="form-control" 
                    disabled 
                    value={formData.email} 
                    style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', color: 'var(--pk-text-sec)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Роль в системе
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.role} 
                    disabled 
                    style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', color: 'var(--pk-text-sec)' }}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                    Телефон
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.phone} 
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
              </div>
            </div>

            {/* Данные организации */}
            {(formData.role === 'supplier' || formData.role === 'organizer' || formData.iin_bin) && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid var(--pk-border)', boxShadow: 'none' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={20} color="var(--pk-primary)" />
                  Данные организации
                </h3>
                
                <div className="grid-2" style={{ gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>ИИН / БИН</label>
                    <input type="text" className="form-control" value={formData.iin_bin || 'Не указан'} disabled style={{ backgroundColor: 'var(--pk-bg-subtle, #f8fafc)', color: 'var(--pk-text-sec)' }} />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Наименование организации (ТОО / ИП)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.company_name} 
                      onChange={e => setFormData({ ...formData, company_name: e.target.value })} 
                      placeholder='Например: ТОО "Asia Partners"' 
                    />
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Адрес компании</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.company_address} 
                      onChange={e => setFormData({ ...formData, company_address: e.target.value })} 
                      placeholder="Например: г. Астана, ул. Достык 18" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>Отмена</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminUserEditModal;
