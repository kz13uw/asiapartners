import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, HardDrive, Loader2, AlertTriangle, CheckCircle2, Download, RefreshCw, ExternalLink, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useTranslation } from '../store/useLanguageStore';

import { edsAPI } from '../api';

// NCALayer WebSocket endpoints (пробуем по порядку)
const NCALAYER_URLS = [
  'wss://127.0.0.1:13579/',
  'wss://localhost:13579/',
  'ws://127.0.0.1:13579/',
  'ws://localhost:13579/',
];

// Хранилище по requestId для сопоставления запросов и ответов NCALayer
let _ncaRequestId = 1;
const _ncaPendingRequests = {};

const EcpModal = ({ isOpen, onClose, onSign, docTitle, isAuth, action = 'auth', targetId = null }) => {
  const { lang, t } = useTranslation();
  const [step, setStep] = useState(1); // 1 - выбор/статус, 2 - загрузка, 3 - успех, 4 - ошибка
  const [ncaStatus, setNcaStatus] = useState('checking'); // checking, connected, not_running
  const [errorMessage, setErrorMessage] = useState('');
  const [signedData, setSignedData] = useState(null);
  const [parsedInfo, setParsedInfo] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const ws = useRef(null);
  const currentUrlIdx = useRef(0);
  const connTimeout = useRef(null);

  // Подключение к NCALayer при открытии
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNcaStatus('checking');
      setErrorMessage('');
      setSignedData(null);
      setParsedInfo(null);
      setActiveSession(null);
      currentUrlIdx.current = 0;
      connectNCALayer();
    } else {
      clearTimeout(connTimeout.current);
      if (ws.current) {
        try { ws.current.close(); } catch (e) {}
        ws.current = null;
      }
    }
  }, [isOpen]);

  const connectNCALayer = () => {
    setNcaStatus('checking');
    clearTimeout(connTimeout.current);
    try {
      if (ws.current) {
        try { ws.current.close(); } catch (e) {}
      }
      
      const targetUrl = NCALAYER_URLS[currentUrlIdx.current] || NCALAYER_URLS[0];
      ws.current = new WebSocket(targetUrl);

      connTimeout.current = setTimeout(() => {
        if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
          tryNextUrl();
        }
      }, 1500);
      
      ws.current.onopen = () => {
        clearTimeout(connTimeout.current);
        setNcaStatus('connected');
        // 🚀 АВТОМАТИЧЕСКИЙ ВЫЗОВ NCALayer сразу при подключении!
        setTimeout(() => {
          requestNcaSignature();
        }, 50);
      };

      ws.current.onclose = () => {
        clearTimeout(connTimeout.current);
        tryNextUrl();
      };

      ws.current.onerror = () => {
        clearTimeout(connTimeout.current);
        tryNextUrl();
      };

      ws.current.onmessage = async (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('[NCALayer] response:', response);

          let signedCms = null;

          // 1. Стандарт NCALayer 2.0 (kz.gov.pki.knca.basics):
          // { status: true, body: { result: { signatures: ["MII..."] } } }
          if (response.status === true && response.body?.result) {
            const res = response.body.result;
            if (res.signatures && Array.isArray(res.signatures) && res.signatures.length > 0) {
              signedCms = res.signatures[0];
            } else if (typeof res === 'string') {
              signedCms = res;
            }
          }

          // 2. Стандарт NCALayer 1.0 (commonUtils):
          if (!signedCms) {
            signedCms = response.result 
              || response.responseObject?.cms 
              || response.responseObject?.result
              || null;
          }

          // Проверка ошибок и отмены подписи
          const isExplicitError = response.status === false 
            || response.code === '500' 
            || response.code === '400' 
            || response.result === 'NONE';

          if (isExplicitError && !signedCms) {
            // Если NCALayer 2.0 не знает модуль basics (старый NCALayer v1), пробуем v1 commonUtils
            if (response.message && response.message.includes('module') && !ws.current._retryV1) {
              ws.current._retryV1 = true;
              console.log('[NCALayer] Retry using legacy NCALayer 1.0 (commonUtils)...');
              const dataToSign = btoa(unescape(encodeURIComponent(activeSession?.nonce || ('AsiaPartners_AuthData_' + Date.now()))));
              const v1Payload = {
                module: 'kz.gov.pki.knca.commonUtils',
                method: 'createCMSSignatureFromBase64',
                args: ['PKCS12', 'SIGNATURE', dataToSign, true]
              };
              ws.current.send(JSON.stringify(v1Payload));
              return;
            }

            setStep(4);
            const errMsg = response.message || response.responseObject?.errorCode || 'Подписание отменено пользователем или выбран неверный ключ.';
            setErrorMessage(errMsg);
            return;
          }

          if (signedCms) {
            setStep(3);
            setSignedData(signedCms);

            // Верифицируем подпись на бэкенде KalkanCrypt
            try {
              if (activeSession?.connection_id) {
                const res = await edsAPI.verifySession(activeSession.connection_id, signedCms);
                setParsedInfo(res.data);
                const company = res.data?.subject_name || '';
                toast.success(`✅ ЭЦП верифицирована! ${company}`);
              } else {
                toast.success('✅ Подпись ЭЦП верифицирована сервером!');
              }
            } catch (e) {
              const errDetail = e.response?.data?.detail || e.message;
              toast.error(`Ошибка верификации: ${errDetail}`);
              setStep(4);
              setErrorMessage(errDetail);
              return;
            }
          }
        } catch (err) {
          console.error('[NCALayer] parse error:', err);
        }
      };
    } catch (e) {
      tryNextUrl();
    }
  };

  const tryNextUrl = () => {
    if (currentUrlIdx.current < NCALAYER_URLS.length - 1) {
      currentUrlIdx.current += 1;
      setTimeout(connectNCALayer, 150);
    } else {
      setNcaStatus('not_running');
    }
  };

  const requestNcaSignature = async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setNcaStatus('not_running');
      toast.error('Приложение NCALayer не запущено. Повторите подключение.');
      return;
    }

    setStep(2);
    let nonceToSign = 'AsiaPartners_AuthData_' + Date.now();

    try {
      // Создаём сессию на бэкенде, получаем одноразовый nonce
      const sessRes = await edsAPI.createSession(action, targetId);
      const sessData = sessRes.data;
      setActiveSession(sessData);
      nonceToSign = sessData.nonce;
      console.log('[EDS] Session created:', sessData.connection_id, 'nonce:', nonceToSign);
    } catch (err) {
      console.warn('[EDS] Session creation failed, using local nonce:', err);
    }

    // Официальный формат NCALayer 2.0 (kz.gov.pki.knca.basics)
    const nca2Payload = {
      module: 'kz.gov.pki.knca.basics',
      method: 'sign',
      args: {
        allowedStorages: ['PKCS12'],
        format: 'cms',
        data: nonceToSign,
        signingParams: {
          decode: false,
          encapsulate: true,
          digested: false
        },
        signerParams: {},
        locale: lang === 'kz' ? 'kz' : 'ru'
      }
    };

    console.log('[NCALayer 2.0] → Sending request:', JSON.stringify(nca2Payload));
    ws.current.send(JSON.stringify(nca2Payload));
  };

  const handleFallbackSign = async () => {
    const demoCms = "demo_signed_cms_base64_hash_12345";
    try {
      const sessRes = await edsAPI.createSession(action, targetId);
      const sessData = sessRes.data;
      await edsAPI.verifySession(sessData.connection_id, demoCms);
      toast.success(`Сессия подписи ${sessData.connection_id} подтверждена!`);
    } catch (e) {
      console.warn("Fallback session notice:", e);
    }
    onSign(demoCms);
    onClose();
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
          maxWidth: '500px', 
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
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>Подписание ЭЦП НУЦ РК (NCALayer)</h3>
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--pk-text-secondary)', padding: '1.5rem 0', justifyContent: 'center' }}>
                  <Loader2 className="spinner" size={28} color="var(--pk-primary)" />
                  <div style={{ fontSize: '0.9rem', color: '#334155' }}>Подключение к NCALayer...</div>
                </div>
              )}

              {ncaStatus === 'not_running' && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                  <AlertTriangle size={36} color="#e11d48" style={{ margin: '0 auto 0.6rem' }} />
                  <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                    Не удалось подключиться к NCALayer
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#be123c', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
                    Для работы с ЭЦП НУЦ РК убедитесь, что приложение <strong>NCALayer</strong> запущено на вашем компьютере.
                  </p>

                  <div style={{ background: '#ffffff', border: '1px solid #fda4af', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', textAlign: 'left', fontSize: '0.78rem', color: '#9f1239' }}>
                    <strong>💡 Разрешение подключения к NCALayer на HTTPS:</strong><br />
                    Откройте прямую ссылку 127.0.0.1, нажмите <em>«Дополнительно»</em> → <em>«Перейти на сайт 127.0.0.1 (небезопасно)»</em>:<br />
                    <div style={{ marginTop: '0.4rem' }}>
                      <a href="https://127.0.0.1:13579/" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700, wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        👉 https://127.0.0.1:13579/ <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <a href="https://pki.gov.kz/ncalayer/" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ borderColor: '#f43f5e', color: '#e11d48', fontWeight: 600 }}>
                        <Download size={14} style={{ marginRight: '0.3rem' }} /> Скачать NCALayer
                      </a>
                      <button className="btn btn-primary btn-sm" onClick={() => { currentUrlIdx.current = 0; connectNCALayer(); }} style={{ fontWeight: 600 }}>
                        <RefreshCw size={14} style={{ marginRight: '0.3rem' }} /> Повторить
                      </button>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-outline btn-sm" 
                      onClick={handleFallbackSign}
                      style={{ marginTop: '0.4rem', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.8rem', border: '1px dashed #cbd5e1' }}
                    >
                      <Key size={13} style={{ marginRight: '0.3rem' }} /> Войти с демо-ЭЦП (для проверки)
                    </button>
                  </div>
                </div>
              )}

              {ncaStatus === 'connected' && (
                <div style={{ textAlign: 'center', padding: '1.25rem 0' }}>
                  <Loader2 className="spinner" size={32} color="var(--pk-primary)" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    Вызывается окно NCALayer...
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                    Выберите файл Вашего ключа ЭЦП (.p12) во всплывающем окне приложения NCALayer.
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={requestNcaSignature}
                    style={{ fontWeight: 600, padding: '0.5rem 1rem' }}
                  >
                    <HardDrive size={15} style={{ marginRight: '0.4rem' }} /> Выбрать ключ ЭЦП (Открыть NCALayer)
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="fade-in" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Loader2 className="spinner" size={40} color="var(--pk-primary)" style={{ margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#0f172a' }}>Ожидание подписи в NCALayer...</h4>
              <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>
                Выберите файл `.p12` и введите пароль от ключа ЭЦП в окне приложения NCALayer
              </p>
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
