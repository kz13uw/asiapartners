import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, bidsAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [tender, setTender] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTender = async () => {
      try {
        const res = await tendersAPI.get(id);
        setTender(res.data);
      } catch (error) {
        toast.error('Тендер не найден');
        navigate('/tenders');
      }
    };
    fetchTender();
  }, [id, navigate]);

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!bidPrice || isNaN(bidPrice) || Number(bidPrice) <= 0) {
      toast.error('Введите корректное ценовое предложение');
      return;
    }
    if (Number(bidPrice) >= tender.start_price) {
      toast.error(`Цена должна быть ниже начальной (${tender.start_price.toLocaleString('ru-RU')} тнг)`);
      return;
    }
    setShowEdsModal(true);
  };

  const processBidSubmission = async () => {
    setIsSubmitting(true);
    try {
      // Имитация подписания ЭЦП и вызов API
      const edsHash = "demo_signed_hash_12345"; 
      
      await bidsAPI.submit({
        tender_id: tender.id,
        price: Number(bidPrice),
        eds_hash: edsHash
      });
      
      toast.success('Заявка успешно подана и подписана ЭЦП!');
      navigate('/supplier/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при подаче заявки');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
    }
  };

  if (!tender) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="loader-spinner"></span> Загрузка лота...</div>;

  return (
    <div className="fade-in">
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate(-1); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>Назад к списку</a>
        <span>›</span>
        <span>Лот {tender.number}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Инфо о тендере */}
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{tender.title}</h2>
          
          <div className="card mb-3" style={{ borderLeft: '4px solid var(--pk-primary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div className="text-sec text-sm">Метод закупок</div>
                <div style={{ fontWeight: 500 }}>{tender.method === 'one_stage' ? 'Одноэтапный на понижение' : 'Двухэтапный на понижение'}</div>
              </div>
              <div>
                <div className="text-sec text-sm">Начальная сумма лота</div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--pk-primary)' }}>{tender.start_price.toLocaleString('ru-RU')} ₸</div>
              </div>
              <div>
                <div className="text-sec text-sm">Организатор</div>
                <div style={{ fontWeight: 500 }}>ТОО "Фирма Азия"</div>
              </div>
              <div>
                <div className="text-sec text-sm">Прием заявок (до)</div>
                <div style={{ fontWeight: 500 }}>{new Date(tender.deadline_at).toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: '1rem' }}>Описание и требования</h4>
            <p className="text-sec" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {tender.description || 'Описание отсутствует.'}
            </p>
            
            <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Документация организатора</h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled>
                <FileText size={18} /> Техническая спецификация.pdf
              </button>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled>
                <FileText size={18} /> Проект договора.docx
              </button>
            </div>
          </div>
        </div>

        {/* Форма заявки (только для поставщиков) */}
        {user?.role === 'supplier' && (
          <div>
            <div className="card" style={{ position: 'sticky', top: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 color="var(--pk-success)" /> Подача заявки
              </h3>
              
              <form onSubmit={handleSubmitClick}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>1. Квалификационные документы</label>
                  <div className="file-upload-box" style={{ border: '1px dashed var(--pk-border)', padding: '1rem', textAlign: 'center', borderRadius: '6px', backgroundColor: 'var(--pk-bg-main)' }}>
                    <div className="text-sm text-sec">Нажмите для загрузки архива (ZIP, RAR)</div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>2. Ваше ценовое предложение (тнг)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    placeholder="Например: 1200000" 
                    style={{ fontSize: '1.25rem', padding: '0.75rem', fontWeight: 600 }}
                  />
                  <div className="text-sm text-sec" style={{ marginTop: '0.5rem' }}>
                    Шаг понижения: {tender.step_down_pct || 1}%
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" required style={{ marginTop: '0.25rem' }} />
                    <span className="text-sm">Я подтверждаю достоверность предоставленных данных и соглашаюсь с условиями проекта договора.</span>
                  </label>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}>
                  Подписать ЭЦП и Отправить
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => !isSubmitting && setShowEdsModal(false)}
        onSign={processBidSubmission}
        docTitle={`Подписание заявки на сумму: ${Number(bidPrice).toLocaleString('ru-RU')} ₸`}
      />
    </div>
  );
};

export default TenderDetails;
