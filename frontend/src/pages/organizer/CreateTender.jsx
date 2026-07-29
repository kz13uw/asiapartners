import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const CreateTender = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    method: 'one_stage',
    start_price: '',
    step_down_pct: 1,
    deadline_at: '',
    delivery_place: ''
  });

  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTenderId, setCreatedTenderId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.start_price || !formData.deadline_at) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      // Для PoC временно обходим бэкенд, чтобы показать модалку ЭЦП без реальной базы данных
      /*
      const payload = {
        ...formData,
        start_price: Number(formData.start_price),
        step_down_pct: Number(formData.step_down_pct),
        deadline_at: new Date(formData.deadline_at).toISOString()
      };
      
      const res = await tendersAPI.create(payload);
      setCreatedTenderId(res.data.id);
      */
      setCreatedTenderId(999);
      
      // 2. Открываем модалку для подписи
      setShowEdsModal(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при создании черновика');
    }
  };

  const processPublish = async () => {
    if (!createdTenderId) return;
    setIsSubmitting(true);
    try {
      // Имитация подписи
      const edsHash = "demo_publish_signature_56789";
      await tendersAPI.publish(createdTenderId, edsHash);
      
      toast.success('Закупка успешно опубликована!');
      navigate('/organizer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка публикации');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate(-1); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>Назад к списку</a>
        <span>›</span>
        <span>Новая закупочная процедура</span>
      </div>

      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--pk-border)', paddingBottom: '1rem' }}>Формирование лота</h2>
        
        <form onSubmit={handleFormSubmit}>
          {/* Блок 1: Основная информация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>1. Основные сведения</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Наименование закупки (Лота) <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="text" name="title" className="form-control" placeholder="Например: Строительно-монтажные работы" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Краткое описание (Техническое задание)</label>
              <textarea name="description" className="form-control" rows="4" placeholder="Опишите требования к товару/услуге" value={formData.description} onChange={handleChange}></textarea>
            </div>
          </div>

          {/* Блок 2: Параметры закупки */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>2. Параметры процедуры</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Метод закупки <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <select name="method" className="form-control" value={formData.method} onChange={handleChange} required>
                <option value="one_stage">Одноэтапный тендер на понижение</option>
                <option value="two_stage">Двухэтапный тендер (С квалификацией)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Окончание приема заявок <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="datetime-local" name="deadline_at" className="form-control" value={formData.deadline_at} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Стартовая сумма (тнг) <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="number" name="start_price" className="form-control" placeholder="0.00" value={formData.start_price} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Шаг понижения (%)</label>
              <input type="number" name="step_down_pct" className="form-control" min="0.5" max="10" step="0.5" value={formData.step_down_pct} onChange={handleChange} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Место поставки</label>
              <input type="text" name="delivery_place" className="form-control" placeholder="Адрес поставки" value={formData.delivery_place} onChange={handleChange} />
            </div>
          </div>

          {/* Блок 3: Документация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>3. Прикрепленные документы</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="file-upload-box" style={{ border: '1px dashed var(--pk-border)', padding: '1.5rem', textAlign: 'center', borderRadius: '6px' }}>
              <UploadCloud size={32} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong>Проектно-сметная документация (ПСД)</strong></div>
              <div className="text-sm text-sec">Нажмите для загрузки (PDF, ZIP)</div>
            </div>
            <div className="file-upload-box" style={{ border: '1px dashed var(--pk-border)', padding: '1.5rem', textAlign: 'center', borderRadius: '6px' }}>
              <UploadCloud size={32} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong>Проект договора</strong></div>
              <div className="text-sm text-sec">Нажмите для загрузки (DOCX, PDF)</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ flex: 1, justifyContent: 'center' }}>Отмена</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Создать и Опубликовать (ЭЦП)</button>
          </div>
        </form>
      </div>

      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => !isSubmitting && setShowEdsModal(false)}
        onSign={processPublish}
        docTitle={`Публикация лота: ${formData.title}`}
      />
    </div>
  );
};

export default CreateTender;
