import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, HardDrive, Loader2, AlertTriangle, CheckCircle2, Download, RefreshCw } from 'lucide-react';
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
    setNcaStatus('checking');
    try {
      if (ws.current) {
        ws.current.close();
      }
      ws.current = new WebSocket(NCALAYER_WS_URL);
      
      ws.current.onopen = () => {
        setNcaStatus('connected');
      };

      ws.current.onclose = () => {
        setNcaStatus('not_running');
      };

      ws.current.onerror = () => {
        setNcaStatus('not_running');
      };

      ws.current.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.code === '500' || response.code === '400' || response.result === 'NONE') {
            setStep(4);
            setErrorMessage('Подписание отменено пользователем или выбран неверный ключ ЭЦП.');
            return;
          }

          if (response.result) {
            setStep(3);
            setSignedData(response.result);
            
            try {
              const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
              const verifyUrl = isLocal ? 'http://localhost:8000/api/v1/eds/verify' : '/api/v1/eds/verify';
              const res = await axios.post(verifyUrl, {
                cms_base64: response.result
              });
              setParsedInfo(res.data);
              toast.success('Подпись ЭЦП верифицирована сервером!');
            } catch (e) {
              console.warn("Notice: Backend verification response", e);
            }
          }
        } catch (err) {
          console.error("NCALayer parsing error", err);
        }
      };
    } catch (e) {
      setNcaStatus('not_running');
    }
  };

  const requestNcaSignature = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setNcaStatus('not_running');
      toast.error('Приложение NCALayer не запущен. Повторите подключение.');
      return;
    }
    setStep(2);
    const dataToSign = "AsiaPartners_AuthData_" + Date.now();
    const requestPayload = {
      module: "kz.gov.pki.knca.commonUtils",
      method: "createCMSSignatureFromData",
      args: ["PKCS12", "SIGNATURE", dataToSign, true]
    };
    ws.current.send(JSON.stringify(requestPayload));
  };

  const handleComplete = () => {
    if (!signedData) {
      toast.error('Ошибка: Подпись ЭЦП отсутствует');
      return;
    }
    onSign(signedData);
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
          maxWidth: '480px', 
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
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>{t('eds_modal_title') || 'Подписание ЭЦП НУЦ РК'}</h3>
          </div>
          <button onClick={onClose} disabled={step === 2} style={{ background: 'none', border: 'none', cursor: step === 2 ? 'not-allowed' : 'pointer', fontSize: '1.5rem', lineHeight: 1, color: '#64748b', opacity: step === 2 ? 0.5 : 1, padding: '0.2rem' }}>×</button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flexGrow: 1 }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px', borderLeft: '3px solid var(--pk-primary)' }}>
            <strong>{t('eds_action_label') || 'Действие:'}</strong> {docTitle || t('eds_doc_signing') || 'Авторизация по ЭЦП'}
          </div>

          {step === 1 && (
            <div className="fade-in">
              {ncaStatus === 'checking' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--pk-text-secondary)', padding: '1rem 0', justifyContent: 'center' }}>
                  <Loader2 className="spinner" size={20} /> Проверка подключения к NCALayer...
                </div>
              )}

              {ncaStatus === 'not_running' && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                  <AlertTriangle size={36} color="#e11d48" style={{ margin: '0 auto 0.6rem' }} />
                  <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                    NCALayer не запущен на вашем ПК
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#be123c', lineHeight: 1.4, margin: '0 0 1.25rem 0' }}>
                    Для работы с ЭЦП НУЦ РК необходимо запустить приложение <strong>NCALayer</strong>. Если оно у вас не установлено, скачайте его с официального портала НУЦ РК.
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                    <a href="https://pki.gov.kz/ncalayer/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ borderColor: '#f43f5e', color: '#e11d48', fontWeight: 600 }}>
                      <Download size={14} style={{ marginRight: '0.3rem' }} /> Скачать NCALayer
                    </a>
                    <button className="btn btn-primary btn-sm" onClick={connectNCALayer} style={{ fontWeight: 600 }}>
                      <RefreshCw size={14} style={{ marginRight: '0.3rem' }} /> Повторить
                    </button>
                  </div>
                </div>
              )}

              {ncaStatus === 'connected' && (
                <div>
                  <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                    Приложение NCALayer подключено. Выберите ваш ключ ЭЦП (PKCS12 *.p12):
                  </p>
                  <div 
                    onClick={requestNcaSignature}
                    style={{ border: '2px dashed var(--pk-primary)', backgroundColor: 'var(--pk-primary-light)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ background: 'var(--pk-bg-surface)', padding: '0.6rem', borderRadius: '50%', border: '1px solid var(--pk-primary)' }}>
                      <HardDrive size={24} color="var(--pk-primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pk-primary)' }}>Выбрать ключ ЭЦП (PKCS12)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--pk-text-secondary)' }}>Нажмите для выбора файла *.p12 в окне NCALayer</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Loader2 className="spinner" size={40} color="var(--pk-primary)" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
              <h4 style={{ margin: '0 0 0.25rem 0' }}>Ожидание подписи в NCALayer...</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>Введите пароль от Вашего ключа ЭЦП в всплывающем окне NCALayer</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <div style={{ background: '#defbe6', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem' }}>
                <CheckCircle2 size={40} color="#198038" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#198038', fontSize: '1.1rem' }}>Подпись ЭЦП успешно сформирована!</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--pk-text-secondary)' }}>Нажмите кнопку ниже для завершения операции</p>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 700 }} onClick={handleComplete}>
                Завершить
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ background: '#ffe5e5', border: '1px solid var(--pk-danger)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-danger)', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <AlertTriangle size={18} /> {t('eds_error_title') || 'Ошибка подписи ЭЦП'}
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>{errorMessage}</p>
              </div>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }} onClick={() => setStep(1)}>
                {t('eds_try_again_btn') || 'Попробовать снова'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EcpModal;
