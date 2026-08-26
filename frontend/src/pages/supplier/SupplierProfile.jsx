import React, { useState, useEffect } from 'react';
import { Verified, FileText, Upload, RefreshCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { useCompany } from '../../hooks/useCompany';
import { useTranslation } from '../../store/useLanguageStore';

const SupplierProfile = () => {
  const { lang, t } = useTranslation();
  const { company, loading } = useCompany();
  const [profile, setProfile] = useState(null);

  const [ustavDoc, setUstavDoc] = useState(() => {
    try {
      const saved = localStorage.getItem('profile_ustav_doc');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { name: 'Устав ТОО', date: '10.02.2024', status: 'uploaded' };
  });

  const [egovDoc, setEgovDoc] = useState(() => {
    try {
      const saved = localStorage.getItem('profile_egov_doc');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const ustavFileRef = React.useRef(null);
  const egovFileRef = React.useRef(null);

  useEffect(() => {
    if (company) {
      setProfile({
        bin: company.bin || '',
        name: company.name || company.full_name || '',
        directorName: company.director_name || '',
        directorIin: company.director_iin || '',
        address: company.address || '',
        email: company.email || '',
        phone: company.phone || '',
        iban: company.iban || ''
      });
    }
  }, [company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (profile) {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUstavClick = () => {
    if (ustavFileRef.current) ustavFileRef.current.click();
  };

  const handleEgovClick = () => {
    if (egovFileRef.current) egovFileRef.current.click();
  };

  const addToVault = (docName, category, format) => {
    try {
      const savedVault = localStorage.getItem('supplier_vault_docs');
      let vault = savedVault ? JSON.parse(savedVault) : [];
      const newVaultItem = {
        id: Date.now(),
        name: docName,
        category: category,
        date: new Date().toLocaleDateString('ru-RU'),
        size: '1.5 МБ',
        format: format
      };
      vault = [newVaultItem, ...vault];
      localStorage.setItem('supplier_vault_docs', JSON.stringify(vault));
    } catch (e) {}
  };

  const handleUstavChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading(`Загрузка файла "${file.name}"...`);
    setTimeout(() => {
      const docData = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        date: new Date().toLocaleDateString('ru-RU'),
        status: 'uploaded'
      };
      setUstavDoc(docData);
      localStorage.setItem('profile_ustav_doc', JSON.stringify(docData));
      addToVault(docData.name, 'Учредительные', file.name.split('.').pop()?.toUpperCase() || 'PDF');
      toast.success(`Устав "${file.name}" успешно обновлен и сохранен!`, { id: toastId });
    }, 600);
  };

  const handleEgovChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading(`Загрузка файла "${file.name}"...`);
    setTimeout(() => {
      const docData = {
        name: file.name.replace(/\.[^/.]+$/, ""),
        date: new Date().toLocaleDateString('ru-RU'),
        status: 'uploaded'
      };
      setEgovDoc(docData);
      localStorage.setItem('profile_egov_doc', JSON.stringify(docData));
      addToVault(docData.name, 'Справка eGov', file.name.split('.').pop()?.toUpperCase() || 'PDF');
      toast.success(`Справка E-gov "${file.name}" успешно загружена!`, { id: toastId });
    }, 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        bin: profile.bin,
        full_name: profile.name,
        legal_form: 'ТОО',
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        iban: profile.iban,
        director_name: profile.directorName,
        director_iin: profile.directorIin,
      };
      const { usersAPI } = await import('../../api');
      await usersAPI.updateCompany(payload);
      toast.success('Реквизиты компании успешно сохранены!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения реквизитов компании');
    }
  };

  if (loading || !profile) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><span className="loader-spinner"></span></div>;
  }

  return (
    <div className="fade-in">
      {/* Hidden File Inputs */}
      <input type="file" ref={ustavFileRef} onChange={handleUstavChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.zip,.jpg,.png" />
      <input type="file" ref={egovFileRef} onChange={handleEgovChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.zip,.jpg,.png" />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', lineHeight: 1.2, margin: 0 }}>Профиль и Реквизиты Контрагента</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>Данные компании</h2>
            <p className="text-secondary" style={{ color: 'var(--pk-text-secondary)', margin: 0 }}>Часть информации получена автоматически из сертификата ЭЦП и не подлежит изменению.</p>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Verified size={16} /> Верифицирован
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Основные реквизиты (Заблокированы) */}
          <h4 style={{ marginBottom: '1rem' }}>Информация о регистрации</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>БИН Организации</label>
              <input type="text" className="form-control" value={profile.bin} disabled style={{ backgroundColor: '#f4f7f9', color: 'var(--pk-text-secondary)', borderColor: 'transparent', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>Полное наименование (ТОО/АО)</label>
              <input type="text" className="form-control" value={profile.name} disabled style={{ backgroundColor: '#f4f7f9', color: 'var(--pk-text-secondary)', borderColor: 'transparent', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>ФИО Первого руководителя</label>
              <input type="text" className="form-control" value={profile.directorName} disabled style={{ backgroundColor: '#f4f7f9', color: 'var(--pk-text-secondary)', borderColor: 'transparent', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>ИИН Руководителя</label>
              <input type="text" className="form-control" value={profile.directorIin} disabled style={{ backgroundColor: '#f4f7f9', color: 'var(--pk-text-secondary)', borderColor: 'transparent', cursor: 'not-allowed' }} />
            </div>
          </div>

          {/* Контакты и банковские данные (Редактируемые) */}
          <h4 style={{ marginBottom: '1rem' }}>Контактные и банковские данные</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>Юридический адрес</label>
              <input type="text" name="address" className="form-control" value={profile.address} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>Электронная почта (логин)</label>
              <input type="email" name="email" className="form-control" value={profile.email} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>Телефон для связи</label>
              <input type="tel" name="phone" className="form-control" value={profile.phone} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--pk-text-secondary)' }}>Расчетный счет (IBAN)</label>
              <input type="text" name="iban" className="form-control" value={profile.iban} onChange={handleChange} required />
            </div>
          </div>
          
          {/* Уставные документы */}
          <div style={{ borderTop: '1px solid var(--pk-border)', paddingTop: '2rem', marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Аккредитация и Уставные документы</h4>
            <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>Загрузите отсканированные копии документов для участия в крупных тендерах (до 15 МБ).</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {/* Card 1: Устав */}
              <div style={{ border: '1px solid var(--pk-success)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', background: '#defbe6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <FileText size={32} color="var(--pk-success)" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#198038' }}>{ustavDoc.name}</div>
                    <div className="text-sm">Загружен {ustavDoc.date}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={handleUstavClick}
                  className="btn btn-outline" 
                  style={{ borderColor: 'var(--pk-success)', background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <RefreshCcw size={16} /> Обновить
                </button>
              </div>
              
              {/* Card 2: E-gov */}
              {egovDoc ? (
                <div style={{ border: '1px solid var(--pk-success)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', background: '#defbe6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <FileText size={32} color="var(--pk-success)" />
                    <div>
                      <div style={{ fontWeight: 600, color: '#198038' }}>{egovDoc.name}</div>
                      <div className="text-sm">Загружен {egovDoc.date}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleEgovClick}
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--pk-success)', background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                  >
                    <RefreshCcw size={16} /> Обновить
                  </button>
                </div>
              ) : (
                <div style={{ border: '1px solid var(--pk-border)', padding: '1.5rem', borderRadius: 'var(--pk-radius-md)', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Upload size={32} color="var(--pk-text-secondary)" />
                    <div>
                      <div style={{ fontWeight: 600 }}>Справка E-gov (egov.kz)</div>
                      <div className="text-sm text-secondary">Необязательно</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleEgovClick}
                    className="btn btn-primary btn-sm" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                  >
                    <Upload size={16} /> Загрузить
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right', marginTop: '3rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={20} /> Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierProfile;
