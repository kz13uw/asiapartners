import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, HardDrive, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, categoriesAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

import { useTranslation } from '../../store/useLanguageStore';

const defaultCategoriesFallback = [
  { id: 1, name: "🏗️ Строительство и Девелопмент", code: "construction" },
  { id: 2, name: "🌾 Сельское хозяйство и Агросектор", code: "agri" },
  { id: 3, name: "🏨 Гостиничный бизнес и HoReCa", code: "hospitality" },
  { id: 4, name: "🚚 Транспорт и Логистика", code: "logistics" },
  { id: 5, name: "🏭 Производство и Промышленность", code: "production" },
];

const CreateTender = () => {
  const navigate = useNavigate();
  const { lang, t } = useTranslation();
  const { user } = useAuthStore();
  
  const [categories, setCategories] = useState(defaultCategoriesFallback);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    method: 'zcp',
    start_price: '',
    deadline_at: '',
    delivery_place: ''
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesAPI.list();
        if (res.data && res.data.length > 0) {
          setCategories(res.data);
        }
      } catch (e) {
        console.warn("Categories load fallback notice:", e);
      }
    };
    loadCategories();
  }, []);

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

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        method: formData.method || 'zcp',
        start_price: parseFloat(formData.start_price),
        deadline_at: new Date(formData.deadline_at).toISOString(),
        delivery_place: formData.delivery_place || null
      };

      const res = await tendersAPI.create(payload);
      setCreatedTenderId(res.data.id);
      await tendersAPI.publish(res.data.id, "demo_publish_signature_56789");
      toast.success('Закупка успешно создана и опубликована!');
      navigate('/organizer/dashboard');
    } catch (error) {
      console.error("Create tender error:", error);
      toast.error(error.response?.data?.detail || 'Ошибка при создании лота');
    } finally {
      setIsSubmitting(false);
    }
  };

  const processPublish = async (signedCms) => {
    if (!createdTenderId) return;
    setIsSubmitting(true);
    try {
      const edsHash = signedCms || "demo_publish_signature_56789";
      await tendersAPI.publish(createdTenderId, edsHash);
      
      toast.success('Закупка успешно создана и опубликована по ЭЦП!');
      navigate('/organizer/dashboard');
    } catch (error) {
      console.error("Publish error:", error);
      toast.error(error.response?.data?.detail || 'Ошибка публикации лота');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate(-1); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>{t('back_to_list')}</a>
        <span>›</span>
        <span>{t('new_procedure')}</span>
      </div>

      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--pk-border)', paddingBottom: '1rem' }}>{t('lot_formation')}</h2>
        
        <form onSubmit={handleFormSubmit}>
          {/* Блок 1: Основная информация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>{t('section_1')}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('tender_title_label')} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="text" name="title" className="form-control" placeholder={t('placeholder_title')} value={formData.title} onChange={handleChange} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('tender_category_label')}</label>
              <select name="category_id" className="form-control" value={formData.category_id || ''} onChange={handleChange}>
                <option value="">{t('placeholder_category')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('tender_desc_label')}</label>
              <textarea name="description" className="form-control" rows="3" placeholder={t('placeholder_desc')} value={formData.description} onChange={handleChange}></textarea>
            </div>
          </div>

          {/* Блок 2: Параметры закупки */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>{t('section_2')}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('procedure_method')} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <select name="method" className="form-control" value="zcp" disabled required>
                <option value="zcp">{t('open_electronic_tender')}</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('deadline_label')} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="datetime-local" name="deadline_at" className="form-control" value={formData.deadline_at} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('start_price_label')} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="number" name="start_price" className="form-control" placeholder="0.00" value={formData.start_price} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('delivery_place_label')} <span style={{ color: 'var(--pk-danger)' }}>*</span></label>
              <input type="text" name="delivery_place" className="form-control" placeholder={t('placeholder_delivery')} value={formData.delivery_place} onChange={handleChange} required />
            </div>
          </div>

          {/* Блок 3: Документация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>{t('section_3')}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="file-upload-box" style={{ border: '1px dashed var(--pk-border)', padding: '1.5rem', textAlign: 'center', borderRadius: '6px' }}>
              <UploadCloud size={32} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong>{t('psd_doc')}</strong></div>
              <div className="text-sm text-sec">PDF, ZIP</div>
            </div>
            <div className="file-upload-box" style={{ border: '1px dashed var(--pk-border)', padding: '1.5rem', textAlign: 'center', borderRadius: '6px' }}>
              <UploadCloud size={32} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong>{t('contract_draft_doc')}</strong></div>
              <div className="text-sm text-sec">DOCX, PDF</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ flex: 1, justifyContent: 'center' }}>{t('btn_cancel')}</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={isSubmitting}>
              {isSubmitting ? 'Создание...' : t('btn_publish_eds')}
            </button>
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
