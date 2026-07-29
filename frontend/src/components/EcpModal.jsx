import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, HardDrive, KeyRound, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const NCALAYER_WS_URL = 'wss://127.0.0.1:13579/';

const EcpModal = ({ isOpen, onClose, onSign, docTitle }) => {
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
          // Успешная подпись
          setStep(3);
          setSignedData(response.result);
          
          // Отправляем CMS на бэкенд для проверки
          try {
            const res = await axios.post('http://127.0.0.1:8000/api/v1/eds/verify', {
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

  const handleSign = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      toast.error('Соединение с NCALayer потеряно');
      return;
    }

    setStep(2); // Загрузка

    // Создаем тестовую строку для подписания (в реальности это хэш тендера/заявки)
    const dataToSign = btoa(unescape(encodeURIComponent(docTitle || 'Тестовый документ для портала Азия')));

    const request = {
      module: "kz.gov.pki.knca.commonUtils",
      method: "createCAdESFromBase64",
      args: ["PKCS12", "SIGNATURE", dataToSign, true] // true = detached signature
    };

    ws.current.send(JSON.stringify(request));
  };

  const handleComplete = () => {
    onSign(signedData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="modal-card card" style={{ width: '100%', maxWidth: '500px', margin: '2rem', animation: 'slideUp 0.3s ease-out', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--pk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck color="var(--pk-primary)" size={24} />
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Подписание ЭЦП (NCALayer)</h3>
          </div>
          <button onClick={onClose} disabled={step === 2} style={{ background: 'none', border: 'none', cursor: step === 2 ? 'not-allowed' : 'pointer', fontSize: '1.5rem', lineHeight: 1, color: 'var(--pk-text-secondary)', opacity: step === 2 ? 0.5 : 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '2rem 1.5rem' }}>
          <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--pk-text-secondary)', background: 'var(--pk-bg-main)', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid var(--pk-primary)' }}>
            <strong>Действие:</strong> {docTitle || 'Подписание документа'}
          </div>

          {step === 1 && (
            <div className="fade-in">
              {ncaStatus === 'checking' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--pk-text-secondary)' }}>
                  <Loader2 className="spinner" size={20} /> Проверка связи с NCALayer...
                </div>
              )}

              {ncaStatus === 'not_running' && (
                <div style={{ background: '#ffe5e5', border: '1px solid var(--pk-danger)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    <AlertTriangle size={20} /> NCALayer не запущен
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Пожалуйста, запустите программу NCALayer на вашем компьютере. Если она не установлена, скачайте её с сайта pki.gov.kz.</p>
                  <button className="btn btn-outline btn-sm mt-3" onClick={connectNCALayer}>Проверить снова</button>
                </div>
              )}

              {ncaStatus === 'connected' && (
                <div>
                  <p style={{ marginBottom: '1.5rem' }}>Установлено безопасное соединение с NCALayer. Выберите хранилище ключа для подписания:</p>
                  <div 
                    onClick={handleSign}
                    style={{ border: '2px dashed var(--pk-primary)', backgroundColor: 'var(--pk-primary-light)', borderRadius: '8px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    <div style={{ background: 'var(--pk-bg-surface)', padding: '0.75rem', borderRadius: '50%', border: '1px solid var(--pk-primary)' }}>
                      <HardDrive size={24} color="var(--pk-primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--pk-primary)' }}>Персональный компьютер (PKCS12)</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--pk-text-secondary)' }}>Откроется стандартное окно NCALayer</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="fade-in" style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Loader2 className="spinner" size={48} color="var(--pk-primary)" style={{ margin: '0 auto 1.5rem', animation: 'spin 1s linear infinite' }} />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Ожидание NCALayer...</h3>
              <p className="text-secondary" style={{ margin: 0 }}>Пожалуйста, выберите ключ и введите пароль в появившемся окне.</p>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === 3 && (
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <div style={{ background: '#defbe6', padding: '2rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={48} color="#198038" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#198038' }}>Подписано успешно!</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--pk-text-secondary)' }}>Криптографическая подпись сформирована.</p>
              </div>

              {parsedInfo && (
                <div style={{ textAlign: 'left', background: 'var(--pk-bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--pk-border)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--pk-text-secondary)', marginBottom: '0.25rem' }}>Данные сертификата (вернул Бэкенд):</div>
                  <div style={{ fontWeight: 600 }}>{parsedInfo.subject_name}</div>
                  <div style={{ fontSize: '0.9rem' }}>ИИН/БИН: {parsedInfo.iin_bin}</div>
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleComplete}>
                Завершить операцию
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="fade-in">
              <div style={{ background: '#ffe5e5', border: '1px solid var(--pk-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--pk-danger)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <AlertTriangle size={20} /> Действие отменено или ошибка
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{errorMessage}</p>
              </div>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStep(1)}>
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EcpModal;
