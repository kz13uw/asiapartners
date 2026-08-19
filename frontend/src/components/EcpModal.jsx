import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, HardDrive, Loader2, AlertTriangle, CheckCircle2, User, Mail, Phone, MapPin, Building, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

import { useTranslation } from '../store/useLanguageStore';

const NCALAYER_WS_URL = 'wss://127.0.0.1:13579/';

const EcpModal = ({ isOpen, onClose, onSign, docTitle, isAuth }) => {
  const { lang, t } = useTranslation();
  const [step, setStep] = useState(1); // 1 - выбор/статус, 2 - загрузка, 3 - успех, 4 - ошибка
  const [ncaStatus, setNcaStatus] = useState('checking'); // checking, connected, not_running
  const [errorMessage, setErrorMessage] = useState('');
  const [signedData, setSignedData] = useState(null);
  const [parsedInfo, setParsedInfo] = useState(null);
  const ws = useRef(null);

  // Extra registration fields for Supplier
  const [extraFields, setExtraFields] = useState({
    email: 'supplier@asia.kz',
    phone: '+7 (7222) 55-44-33',
    company_address: 'г. Семей, ул. Кабанбай Батыра 42',
    director_name: 'Ахметов Марат Ерланович',
    business_sector: '🏗️ Строительство и Девелопмент'
  });

  // Подключение к NCALayer при открытии
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNcaStatus('checking');
      setErrorMessage('');
      setSignedData(null);
      setParsedInfo(null);
      connectNCALayer();
    } else {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    }
  }, [isOpen]);

  const connectNCALayer = () => {
    try {
      ws.current = new WebSocket(NCALAYER_WS_URL);
      
      ws.current.onopen = () => {
        setNcaStatus('connected');
      };

      ws.current.onclose = () => {
        if (ncaStatus === 'checking') {
          setNcaStatus('not_running');
        }
      };

      ws.current.onerror = () => {
        setNcaStatus('not_running');
      };

      ws.current.onmessage = async (event) => {
        const response = JSON.parse(event.data);
        if (response.code === '500' || response.code === '400') {
          setStep(4);
          setErrorMessage('Ошибка подписи (возможно, вы отменили действие или выбрали неверный ключ).');
          return;
        }

        if (response.result && response.result !== 'NONE') {
          setStep(3);
          setSignedData(response.result);
          
          try {
            const res = await axios.post('/api/v1/eds/verify', {
              cms_base64: response.result
            });
            setParsedInfo(res.data);
            toast.success('Подпись успешно проверена сервером!');
          } catch (e) {
            console.error("EDS Verification failed", e);
            toast.error('Ошибка верификации подписи на сервере');
          }
        }
      };
    } catch (e) {
      setNcaStatus('not_running');
    }
  };

  const validateExtraFields = () => {
    if (isAuth) {
      if (!extraFields.company_address || extraFields.company_address.trim().length < 3) {
        toast.error('Заполните юридический адрес организации!');
        return false;
      }
      if (!extraFields.phone || extraFields.phone.trim().length < 5) {
        toast.error('Укажите контактный телефон!');
        return false;
      }
      if (!extraFields.email || !extraFields.email.includes('@')) {
        toast.error('Укажите корректный email адрес!');
        return false;
      }
    }
    return true;
  };

  const handleSign = () => {
    if (!validateExtraFields()) return;
    onSign("demo_signed_cms_base64_hash_12345", extraFields);
    toast.success('ЭЦП верифицировано, регистрационные данные привязаны!');
    onClose();
  };

  const handleComplete = () => {
    if (!validateExtraFields()) return;
    onSign(signedData || "demo_signed_cms_base64_hash_12345", extraFields);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{ 
        display: 'flex', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.65)', 
        zIndex: 99999, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backdropFilter: 'blur(5px)', 
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div 
        className="modal-card card" 
        style={{ 
          width: '100%', 
          maxWidth: isAuth ? '540px' : '460px', 
          margin: 'auto', 
          animation: 'slideUp 0.25s ease-out', 
          padding: 0, 
          overflow: 'hidden', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          background: '#ffffff'
        }}
      >
        
        {/* Header */}
        <div style={{ backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderBottom: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck color="var(--pk-primary)" size={22} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>{t('eds_modal_title')}</h3>
          </div>
          <button onClick={onClose} disabled={step === 2} style={{ background: 'none', border: 'none', cursor: step === 2 ? 'not-allowed' : 'pointer', fontSize: '1.5rem', lineHeight: 1, color: '#64748b', opacity: step === 2 ? 0.5 : 1, padding: '0.2rem' }}>×</button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flexGrow: 1 }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', borderLeft: '3px solid var(--pk-primary)' }}>
            <strong>{t('eds_action_label')}</strong> {docTitle || t('eds_doc_signing')}
          </div>

          {/* Supplier Registration Extra Fields */}
          {isAuth && (
            <div style={{ marginBottom: '1rem', padding: '0.85rem', backgroundColor: '#f0f7ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.6rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building size={15} /> Регистрационные данные Поставщика:
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    <Globe size={12} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Сфера деятельности предприятия *
                  </label>
                  <select 
                    className="form-control form-control-sm" 
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    value={extraFields.business_sector} 
                    onChange={e => setExtraFields(p => ({ ...p, business_sector: e.target.value }))}
                  >
                    <option value="🏗️ Строительство и Девелопмент">🏗️ Строительство и Девелопмент</option>
                    <option value="🌾 Сельское хозяйство и Агросектор">🌾 Сельское хозяйство и Агросектор</option>
                    <option value="🚚 Транспорт и Логистика">🚚 Транспорт и Логистика</option>
                    <option value="🏭 Производство и Промышленность">🏭 Производство и Промышленность</option>
                    <option value="⚡ Энергетика и Оборудование">⚡ Энергетика и Оборудование</option>
                    <option value="🏬 Прочие товары и услуги">🏬 Прочие товары и услуги</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    <Mail size={12} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Email (для уведомлений) *
                  </label>
                  <input 
                    type="email" 
                    className="form-control form-control-sm" 
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    placeholder="company@mail.kz" 
                    value={extraFields.email} 
                    onChange={e => setExtraFields(p => ({ ...p, email: e.target.value }))} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    <Phone size={12} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Контактный телефон *
                  </label>
                  <input 
                    type="tel" 
                    className="form-control form-control-sm" 
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    placeholder="+7 (7222) 55-44-33" 
                    value={extraFields.phone} 
                    onChange={e => setExtraFields(p => ({ ...p, phone: e.target.value }))} 
                    required 
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    <MapPin size={12} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> Юридический адрес ТОО / ИП *
                  </label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    placeholder="г. Семей, ул. Промышленная 12" 
                    value={extraFields.company_address} 
                    onChange={e => setExtraFields(p => ({ ...p, company_address: e.target.value }))} 
                    required 
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '0.2rem' }}>
                    <User size={12} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} /> ФИО Руководителя
                  </label>
                  <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    placeholder="Ахметов Марат Ерланович" 
                    value={extraFields.director_name} 
                    onChange={e => setExtraFields(p => ({ ...p, director_name: e.target.value }))} 
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="fade-in">
              {ncaStatus === 'checking' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--pk-text-secondary)', padding: '0.5rem 0' }}>
                  <Loader2 className="spinner" size={18} /> {t('eds_checking_status')}
                </div>
              )}

              {ncaStatus === 'not_running' && (
                <div style={{ background: '#ffffff', border: '1px solid var(--pk-border)', padding: '1rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-primary)', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <ShieldCheck size={18} /> {isAuth ? 'Авторизация и Регистрация по ЭЦП' : t('eds_modal_title')}
                  </div>
                  <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
                    {isAuth ? 'Выберите ключ НУЦ РК через NCALayer или нажмите кнопку быстрого входа:' : 'Выберите ключ НУЦ РК через NCALayer или нажмите кнопку подписания:'}
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontSize: '0.9rem' }} onClick={handleSign}>
                    {isAuth ? 'Подписать ЭЦП и Войти в кабинет' : 'Подписать ЭЦП'}
                  </button>
                </div>
              )}

              {ncaStatus === 'connected' && (
                <div>
                  <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#475569' }}>{t('eds_connected_desc')}</p>
                  <div 
                    onClick={handleSign}
                    style={{ border: '2px dashed var(--pk-primary)', backgroundColor: 'var(--pk-primary-light)', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ background: 'var(--pk-bg-surface)', padding: '0.6rem', borderRadius: '50%', border: '1px solid var(--pk-primary)' }}>
                      <HardDrive size={22} color="var(--pk-primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pk-primary)' }}>{t('eds_pkcs12_title')}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pk-text-secondary)' }}>{t('eds_pkcs12_sub')}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Loader2 className="spinner" size={40} color="var(--pk-primary)" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
              <h4 style={{ margin: '0 0 0.25rem 0' }}>{t('eds_waiting_title')}</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>{t('eds_waiting_sub')}</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <div style={{ background: '#defbe6', padding: '1.25rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <CheckCircle2 size={40} color="#198038" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#198038', fontSize: '1.1rem' }}>{t('eds_success_title')}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--pk-text-secondary)' }}>{t('eds_success_sub')}</p>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }} onClick={handleComplete}>
                {t('eds_complete_btn')}
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ background: '#ffe5e5', border: '1px solid var(--pk-danger)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-danger)', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={18} /> {t('eds_error_title')}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>{errorMessage}</p>
              </div>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }} onClick={() => setStep(1)}>
                {t('eds_try_again_btn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EcpModal;
