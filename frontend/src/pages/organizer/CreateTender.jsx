import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ShieldCheck, HardDrive, UploadCloud, FileText, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, categoriesAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

import { useTranslation } from '../../store/useLanguageStore';
import { saveLocalDraft, getStoredLocalDrafts, removeLocalDraft } from '../../hooks/useTenders';
import LotEditorCard from '../../components/tender/LotEditorCard';
import QualReqList from '../../components/tender/QualReqList';
import TenderFileDropzone from '../../components/tender/TenderFileDropzone';

const defaultCategoriesFallback = [
  { id: 1, name: "📦 Поставка Строительных Материалов", code: "materials", subject_type: "goods" },
  { id: 2, name: "🏗️ Строительно-Монтажные Работы (СМР)", code: "construction", subject_type: "services_works" },
  { id: 3, name: "🌾 Сельхозпродукция и Агрохимия", code: "agri_goods", subject_type: "goods" },
  { id: 4, name: "🛠️ Обслуживание и Ремонт Спецтехники", code: "agri_services", subject_type: "services_works" },
  { id: 5, name: "🚚 Транспортные и Логистические Услуги", code: "logistics_services", subject_type: "services_works" },
];

const CreateTender = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const editingId = id || searchParams.get('draftId');
  const { lang, t } = useTranslation();
  const { user } = useAuthStore();
  
  const [categories, setCategories] = useState(defaultCategoriesFallback);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_type: 'goods', // 'goods' или 'services_works'
    category_id: '',
    method: 'zcp',
    start_price: '',
    delivery_place: ''
  });

  const psdInputRef = useRef(null);
  const contractInputRef = useRef(null);
  const [psdFiles, setPsdFiles] = useState([]);
  const [contractFiles, setContractFiles] = useState([]);
  const [isPsdDragging, setIsPsdDragging] = useState(false);
  const [isContractDragging, setIsContractDragging] = useState(false);

  const handlePsdFilesSelected = (files) => {
    const valid = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' МБ',
      fileObj: file
    }));
    setPsdFiles(prev => [...prev, ...valid]);
    toast.success(`Файл ПСД добавлен: ${valid.map(f => f.name).join(', ')}`);
  };

  const removePsdFile = (id) => {
    setPsdFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleContractFilesSelected = (files) => {
    const valid = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' МБ',
      fileObj: file
    }));
    setContractFiles(prev => [...prev, ...valid]);
    toast.success(`Файл проекта договора добавлен: ${valid.map(f => f.name).join(', ')}`);
  };

  const removeContractFile = (id) => {
    setContractFiles(prev => prev.filter(f => f.id !== id));
  };

  const handlePsdDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPsdDragging(true);
  };
  const handlePsdDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPsdDragging(false);
  };
  const handlePsdDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPsdDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePsdFilesSelected(e.dataTransfer.files);
    }
  };

  const handleContractDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsContractDragging(true);
  };
  const handleContractDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsContractDragging(false);
  };
  const handleContractDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsContractDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleContractFilesSelected(e.dataTransfer.files);
    }
  };

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

  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  useEffect(() => {
    if (!editingId) return;

    const fetchDraftDetails = async () => {
      setIsLoadingDraft(true);
      try {
        let tnd = null;
        try {
          const res = await tendersAPI.get(editingId);
          tnd = res.data;
        } catch (e) {
          const local = getStoredLocalDrafts().find(d => String(d.id) === String(editingId));
          if (local) tnd = local;
        }

        if (tnd) {
          setFormData({
            title: tnd.title || '',
            description: tnd.description || '',
            subject_type: tnd.subject_type || 'goods',
            category_id: tnd.category_id ? String(tnd.category_id) : '',
            method: tnd.method || 'zcp',
            start_price: tnd.start_price || '',
            deadline_at: tnd.deadline_at ? new Date(tnd.deadline_at).toISOString().slice(0, 16) : '',
            delivery_place: tnd.delivery_place || ''
          });

          if (tnd.requires_license !== undefined) {
            setRequiresLicense(!!tnd.requires_license);
          }
          if (tnd.license_category) {
            setLicenseCategory(tnd.license_category);
          }

          if (tnd.qual_requirements && tnd.qual_requirements.length > 0) {
            setQualRequirements(tnd.qual_requirements.map((q, i) => ({
              id: q.id || (Date.now() + i),
              code: q.code || 'general',
              title: q.title,
              is_mandatory: q.is_mandatory !== false
            })));
          }

          if (tnd.documents && tnd.documents.length > 0) {
            const psds = [];
            const contracts = [];
            tnd.documents.forEach((d, idx) => {
              const item = {
                id: d.id || (Date.now() + idx),
                name: d.file_name || d.name || 'Документ',
                size: d.file_size ? `${(d.file_size / (1024*1024)).toFixed(2)} МБ` : (d.size || '1 МБ')
              };
              if (d.doc_type === 'ПСД' || d.category === 'ПСД') psds.push(item);
              else contracts.push(item);
            });
            if (psds.length > 0) setPsdFiles(psds);
            if (contracts.length > 0) setContractFiles(contracts);
          }

          if (tnd.lots && tnd.lots.length > 0) {
            setLots(tnd.lots.map((l, idx) => calculateLot({
              id: l.id || (Date.now() + idx),
              lot_number: l.lot_number || (idx + 1),
              title: l.title || 'Лот №' + (idx + 1),
              description: l.description || '',
              quantity: l.quantity || 1,
              unit: l.unit || 'шт',
              unit_price: l.unit_price || 0,
              start_price: l.start_price || 0,
              vat_mode: l.vat_mode || 'include_vat',
              vat_rate: l.vat_rate || 16,
              vat_amount: l.vat_amount || 0,
              total_price_without_vat: l.total_price_without_vat || 0,
              brand_or_equivalent: l.brand_or_equivalent || '',
              is_equivalent_allowed: l.is_equivalent_allowed !== false,
              advance_payment_pct: l.advance_payment_pct || 0,
              incoterms: l.incoterms || 'DDP',
              delivery_days_type: l.delivery_days_type || 'calendar',
              delivery_days_count: l.delivery_days_count || 14,
              service_start_date: l.service_start_date ? String(l.service_start_date).slice(0, 10) : '',
              service_end_date: l.service_end_date ? String(l.service_end_date).slice(0, 10) : '',
              warranty_months: l.warranty_months || 12,
              delivery_place: l.delivery_place || tnd.delivery_place || ''
            })));
          }
        }
      } catch (err) {
        console.error("Error loading draft details:", err);
        toast.error("Не удалось загрузить данные черновика");
      } finally {
        setIsLoadingDraft(false);
      }
    };

    fetchDraftDetails();
  }, [editingId]);

  const [requiresLicense, setRequiresLicense] = useState(false);
  const [licenseCategory, setLicenseCategory] = useState('Строительно-монтажные работы (СМР) II категории');
  const [qualRequirements, setQualRequirements] = useState([
    { id: 1, code: 'license', title: 'Лицензия / разрешение на вид деятельности', is_mandatory: true },
    { id: 2, code: 'equipment', title: 'Справка о наличии материально-технической базы и техники', is_mandatory: true },
    { id: 3, code: 'financial', title: 'Справка об отсутствии налоговой задолженности', is_mandatory: true },
    { id: 4, code: 'staff', title: 'Список и дипломы штатных квалифицированных специалистов', is_mandatory: false },
    { id: 5, code: 'experience', title: 'Акты выполненных работ по аналогичным объектам за 3 года', is_mandatory: false }
  ]);

  const handleToggleQualMandatory = (id) => {
    setQualRequirements(prev => prev.map(q => q.id === id ? { ...q, is_mandatory: !q.is_mandatory } : q));
  };

  const handleAddQualReq = () => {
    const title = prompt('Введите наименование нового квалификационного документа:');
    if (!title) return;
    setQualRequirements(prev => [
      ...prev,
      { id: Date.now(), code: 'custom', title, is_mandatory: true }
    ]);
    toast.success('Квалификационное требование добавлено!');
  };

  const handleRemoveQualReq = (id) => {
    setQualRequirements(prev => prev.filter(q => q.id !== id));
    toast.success('Требование удалено');
  };

  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTenderId, setCreatedTenderId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubjectTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      subject_type: newType,
      category_id: '' // Сбрасываем выбранную категорию при смене типа предмета
    }));
    toast.success(`Предмет закупки изменен на: ${newType === 'goods' ? '📦 Товары' : '🛠️ Услуги / Работы'}`);
  };

  const filteredCategories = categories.filter(c => {
    const cType = c.subject_type || 'goods';
    return cType === formData.subject_type;
  });

  const validateFormForPublish = () => {
    const errors = {};
    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Наименование закупки является обязательным полем';
    }
    if (!formData.category_id) {
      errors.category_id = 'Выберите категорию предмета закупки';
    }
    if (!formData.deadline_at) {
      errors.deadline_at = 'Укажите дату и время окончания приема заявок';
    }
    if (!formData.start_price || parseFloat(formData.start_price) <= 0) {
      errors.start_price = 'Укажите плановую сумму закупки (больше 0)';
    }

    lots.forEach((lot, idx) => {
      if (!lot.title || !lot.title.trim()) {
        errors[`lot_title_${idx}`] = `Укажите наименование для Лота №${idx + 1}`;
      }
      if (!lot.quantity || parseFloat(lot.quantity) <= 0) {
        errors[`lot_qty_${idx}`] = `Укажите количество для Лота №${idx + 1}`;
      }
      if (!lot.unit_price || parseFloat(lot.unit_price) <= 0) {
        errors[`lot_price_${idx}`] = `Укажите цену за единицу для Лота №${idx + 1}`;
      }
    });

    return errors;
  };

  const handleFormSubmit = async (e, actionType = 'publish') => {
    if (e) e.preventDefault();

    // 1. Проверка правила 3.1
    if (formData.category_id) {
      const selectedCat = categories.find(c => c.id === parseInt(formData.category_id, 10));
      if (selectedCat && selectedCat.subject_type && selectedCat.subject_type !== formData.subject_type) {
        toast.error('⛔ Ошибка правила 3.1: Запрещено объединять в одной закупке «Товары» и «Услуги/Работы»!');
        return;
      }
    }

    // 2. Проверка обязательных полей ТОЛЬКО при ПУБЛИКАЦИИ
    if (actionType === 'publish') {
      const errors = validateFormForPublish();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        const firstErrorKey = Object.keys(errors)[0];
        const firstErrorMsg = errors[firstErrorKey];
        toast.error(`⚠️ Заполните обязательные поля!\n${firstErrorMsg}`);

        const el = document.getElementsByName(firstErrorKey)[0];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const safeIsoDate = (val, defaultDays = null) => {
      if (!val) {
        if (defaultDays !== null) return new Date(Date.now() + defaultDays * 86400000).toISOString();
        return null;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) {
        if (defaultDays !== null) return new Date(Date.now() + defaultDays * 86400000).toISOString();
        return null;
      }
      return d.toISOString();
    };

    try {
      const defaultTitle = formData.title?.trim() || (actionType === 'draft' ? 'Черновик закупки без названия' : 'Новая закупка');
      const defaultStartPrice = parseFloat(formData.start_price) || 0;
      const defaultDeadline = safeIsoDate(formData.deadline_at, 14);

      const payload = {
        title: defaultTitle,
        description: formData.description || null,
        subject_type: formData.subject_type,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        method: formData.method || 'zcp',
        start_price: defaultStartPrice,
        deadline_at: defaultDeadline,
        delivery_place: formData.delivery_place || null,
        requires_license: requiresLicense,
        license_category: requiresLicense ? licenseCategory : null,
        documents: [
          ...psdFiles.map(f => ({ name: f.name, category: 'ПСД', size: f.size })),
          ...contractFiles.map(f => ({ name: f.name, category: 'Проект договора', size: f.size }))
        ],
        qual_requirements: qualRequirements.map(q => ({
          code: q.code || 'general',
          title: q.title,
          is_mandatory: !!q.is_mandatory
        })),
        lots: lots.map((l, idx) => ({
          lot_number: l.lot_number || (idx + 1),
          title: l.title || defaultTitle,
          description: l.description || null,
          quantity: parseFloat(l.quantity) || 1,
          unit: l.unit || 'шт',
          unit_price: parseFloat(l.unit_price) || 0,
          start_price: parseFloat(l.start_price) || 0,
          vat_mode: l.vat_mode,
          vat_rate: parseFloat(l.vat_rate) || 16,
          vat_amount: parseFloat(l.vat_amount) || 0,
          total_price_without_vat: parseFloat(l.total_price_without_vat) || 0,
          brand_or_equivalent: l.brand_or_equivalent || null,
          is_equivalent_allowed: !!l.is_equivalent_allowed,
          advance_payment_pct: parseFloat(l.advance_payment_pct) || 0,
          incoterms: l.incoterms || 'DDP',
          delivery_days_type: l.delivery_days_type || 'calendar',
          delivery_days_count: l.delivery_days_count ? parseInt(l.delivery_days_count, 10) : null,
          service_start_date: safeIsoDate(l.service_start_date),
          service_end_date: safeIsoDate(l.service_end_date),
          warranty_months: l.warranty_months ? parseInt(l.warranty_months, 10) : null,
          delivery_place: l.delivery_place || formData.delivery_place || null
        }))
      };

      if (actionType === 'draft') {
        let draftObj = null;
        try {
          if (editingId) {
            const res = await tendersAPI.update(editingId, { ...payload, status: 'draft' });
            draftObj = res.data;
          } else {
            const res = await tendersAPI.create({ ...payload, status: 'draft' });
            draftObj = res.data;
          }
        } catch (apiErr) {
          console.warn("Backend draft create/update fallback:", apiErr);
          draftObj = {
            id: editingId ? Number(editingId) : Date.now(),
            number: 'Т-DRAFT-' + Math.floor(100000 + Math.random() * 900000),
            status: 'draft',
            created_at: new Date().toISOString(),
            ...payload
          };
        }
        saveLocalDraft(draftObj, user);
        toast.success('Черновик тендера успешно обновлен и сохранен!');
        navigate('/organizer/tenders/drafts');
        return;
      }

      let tenderResId = editingId;
      if (editingId) {
        await tendersAPI.update(editingId, { ...payload, status: 'draft' });
      } else {
        const res = await tendersAPI.create({ ...payload, status: 'draft' });
        tenderResId = res.data.id;
      }
      setCreatedTenderId(tenderResId);
      setShowEdsModal(true);
      toast.success('Параметры закупки подготовлены. Выберите ЭЦП для подписания и публикации!');

    } catch (error) {
      console.error("Create tender error:", error);
      toast.error(getCleanErrorMessage(error, 'Ошибка при сохранении тендера'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCleanErrorMessage = (error, defaultMsg) => {
    const detail = error.response?.data?.detail;
    if (!detail) return error.message || defaultMsg;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(err => {
        const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : '';
        return field ? `Поле «${field}»: ${err.msg}` : err.msg;
      }).join('; ');
    }
    if (typeof detail === 'object') {
      return JSON.stringify(detail);
    }
    return defaultMsg;
  };

  const processPublish = async (signedCms) => {
    if (!createdTenderId) return;
    setIsSubmitting(true);
    try {
      const edsHash = signedCms || "demo_publish_signature_56789";
      await tendersAPI.publish(createdTenderId, edsHash);
      removeLocalDraft(createdTenderId);
      if (editingId) removeLocalDraft(editingId);
      
      toast.success('Закупка успешно создана и опубликована по ЭЦП!');
      navigate('/organizer/dashboard');
    } catch (error) {
      console.error("Publish error:", error);
      toast.error(getCleanErrorMessage(error, 'Ошибка публикации лота'));
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
    }
  };
  const [lots, setLots] = useState([
    {
      id: 1,
      lot_number: 1,
      title: 'Лот №1 — Поставка материалов / Работы',
      description: '',
      quantity: 10,
      unit: 'шт',
      unit_price: 150000,
      start_price: 1740000,
      vat_mode: 'include_vat', // 'include_vat' (16%), 'no_vat' (0%), 'supplier_tax_mode'
      vat_rate: 16,
      vat_amount: 240000,
      total_price_without_vat: 1500000,
      brand_or_equivalent: '',
      is_equivalent_allowed: true,
      advance_payment_pct: 30,
      incoterms: 'DDP',
      delivery_days_type: 'calendar',
      delivery_days_count: 14,
      service_start_date: '',
      service_end_date: '',
      warranty_months: 12,
      delivery_place: 'г. Семей, Объект Азия Парк'
    }
  ]);

  const calculateLot = (lotItem) => {
    const qty = parseFloat(lotItem.quantity) || 0;
    const uPrice = parseFloat(lotItem.unit_price) || 0;
    const baseTotal = qty * uPrice;

    let vatAmount = 0;
    let priceWithoutVat = baseTotal;
    let startPrice = baseTotal;

    if (lotItem.vat_mode === 'include_vat') {
      vatAmount = baseTotal * (16 / 116);
      priceWithoutVat = baseTotal - vatAmount;
      startPrice = baseTotal;
    } else if (lotItem.vat_mode === 'no_vat') {
      vatAmount = 0;
      priceWithoutVat = baseTotal;
      startPrice = baseTotal;
    } else {
      vatAmount = baseTotal * 0.16;
      priceWithoutVat = baseTotal;
      startPrice = baseTotal + vatAmount;
    }

    return {
      ...lotItem,
      vat_amount: Math.round(vatAmount * 100) / 100,
      total_price_without_vat: Math.round(priceWithoutVat * 100) / 100,
      start_price: Math.round(startPrice * 100) / 100
    };
  };

  const handleLotChange = (index, field, value) => {
    setLots(prev => {
      const updated = [...prev];
      const targetLot = { ...updated[index], [field]: value };
      const recalculatedLot = calculateLot(targetLot);
      updated[index] = recalculatedLot;

      const totalTenderPrice = updated.reduce((sum, l) => sum + (l.start_price || 0), 0);
      setFormData(f => ({ ...f, start_price: totalTenderPrice }));

      return updated;
    });
  };

  const handleAddLot = () => {
    const newLotNumber = lots.length + 1;
    const newLot = calculateLot({
      id: Date.now(),
      lot_number: newLotNumber,
      title: formData.subject_type === 'goods' ? `Лот №${newLotNumber} — Поставка товаров` : `Лот №${newLotNumber} — Выполнение работ / Оказание услуг`,
      description: '',
      quantity: 1,
      unit: 'шт',
      unit_price: 100000,
      start_price: 100000,
      vat_mode: 'include_vat',
      vat_rate: 16,
      vat_amount: 13793.1,
      total_price_without_vat: 86206.9,
      brand_or_equivalent: '',
      is_equivalent_allowed: true,
      advance_payment_pct: 0,
      incoterms: 'DDP',
      delivery_days_type: 'calendar',
      delivery_days_count: 10,
      service_start_date: '',
      service_end_date: '',
      warranty_months: 12,
      delivery_place: formData.delivery_place || 'г. Семей, Объект Азия'
    });

    const updatedLots = [...lots, newLot];
    setLots(updatedLots);
    const totalTenderPrice = updatedLots.reduce((sum, l) => sum + (l.start_price || 0), 0);
    setFormData(f => ({ ...f, start_price: totalTenderPrice }));
    toast.success(`Добавлен Лот №${newLotNumber}!`);
  };

  const handleRemoveLot = (index) => {
    if (lots.length <= 1) {
      toast.error('В закупке должен быть как минимум 1 лот!');
      return;
    }
    const updated = lots.filter((_, idx) => idx !== index).map((l, i) => ({ ...l, lot_number: i + 1 }));
    setLots(updated);
    const totalTenderPrice = updated.reduce((sum, l) => sum + (l.start_price || 0), 0);
    setFormData(f => ({ ...f, start_price: totalTenderPrice }));
    toast.success('Лот удален');
  };

  return (
    <div className="fade-in">
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate(-1); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>{t('back_to_list')}</a>
        <span>›</span>
        <span>{t('new_procedure')}</span>
      </div>

      <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--pk-border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{editingId ? '✏️ Редактирование черновика закупки' : t('lot_formation')}</span>
          {editingId && (
            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.85rem' }}>
              ⏳ Драфт Тендера
            </span>
          )}
        </h2>
        
        {isLoadingDraft ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p className="text-sec">Загрузка данных черновика...</p>
          </div>
        ) : (
        <form onSubmit={handleFormSubmit}>
          {/* Блок 3.1: Жесткая валидация предметов закупок */}
          <div style={{ marginBottom: '1.75rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.65rem', color: '#0f172a', fontSize: '0.95rem' }}>
              Предмет закупки <span style={{ color: 'var(--pk-danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.65rem' }}>
              <button
                type="button"
                className={`btn ${formData.subject_type === 'goods' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem', borderRadius: '8px' }}
                onClick={() => handleSubjectTypeChange('goods')}
              >
                📦 <strong>Товары</strong>
              </button>
              <button
                type="button"
                className={`btn ${formData.subject_type === 'services_works' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem', borderRadius: '8px' }}
                onClick={() => handleSubjectTypeChange('services_works')}
              >
                🛠️ <strong>Услуги / Работы</strong>
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              ℹ️ <i>В одной закупке строго запрещено совмещать лоты категории «Товары» и категорий «Услуги / Работы». Поле категорий автоматически фильтруется.</i>
            </div>
          </div>

          {/* Блок 1: Основная информация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>{t('section_1') || '1. Основные сведения'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            
            {/* 1. ID Закупки */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                1. ID Закупки <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>(Авто-генерация)</span>
              </label>
              <input 
                type="text" 
                className="form-control" 
                disabled 
                readOnly
                value={formData.number || (formData.subject_type === 'goods' ? 'T00000000 (авто)' : 'U00000000 (авто)')} 
                style={{
                  backgroundColor: '#f1f5f9',
                  color: 'var(--pk-primary)',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                * Т — для товаров, U — для услуг. Заполняется автоматически.
              </span>
            </div>

            {/* 2. Категория закупки */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                2. Категория закупки <span style={{ color: '#dc2626', fontWeight: 500, fontSize: '0.7em', fontStyle: 'italic' }}>*</span>
              </label>
              <select 
                name="category_id" 
                className="form-control" 
                value={formData.category_id || ''} 
                onChange={handleChange}
                style={{
                  borderColor: fieldErrors.category_id ? '#ef4444' : undefined,
                  backgroundColor: fieldErrors.category_id ? '#fef2f2' : undefined,
                  boxShadow: fieldErrors.category_id ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined
                }}
              >
                <option value="">-- Выберите категорию --</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category_id && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.35rem', fontWeight: 600 }}>
                  ⚠️ {fieldErrors.category_id}
                </div>
              )}
            </div>

            {/* 3. Срок окончания приема заявок */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                3. Срок окончания приема заявок <span style={{ color: '#dc2626', fontWeight: 500, fontSize: '0.7em', fontStyle: 'italic' }}>*</span>
              </label>
              <input 
                type="datetime-local" 
                name="deadline_at" 
                className="form-control" 
                value={formData.deadline_at || ''} 
                onChange={handleChange}
                style={{
                  borderColor: fieldErrors.deadline_at ? '#ef4444' : undefined,
                  backgroundColor: fieldErrors.deadline_at ? '#fef2f2' : undefined,
                  boxShadow: fieldErrors.deadline_at ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined
                }}
              />
              {fieldErrors.deadline_at && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.35rem', fontWeight: 600 }}>
                  ⚠️ {fieldErrors.deadline_at}
                </div>
              )}
            </div>

            {/* 4. Наименование закупки */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                4. Наименование закупки <span style={{ color: '#dc2626', fontWeight: 500, fontSize: '0.7em', fontStyle: 'italic' }}>*</span>
              </label>
              <input 
                type="text" 
                name="title" 
                className="form-control" 
                placeholder={t('placeholder_title') || 'например: Поставка строительных материалов'} 
                value={formData.title} 
                onChange={handleChange}
                style={{
                  borderColor: fieldErrors.title ? '#ef4444' : undefined,
                  backgroundColor: fieldErrors.title ? '#fef2f2' : undefined,
                  boxShadow: fieldErrors.title ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : undefined
                }}
              />
              {fieldErrors.title && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.35rem', fontWeight: 600 }}>
                  ⚠️ {fieldErrors.title}
                </div>
              )}
            </div>

            {/* 5. Место поставки */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                5. Место поставки <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>(Необязательно)</span>
              </label>
              <input 
                type="text" 
                name="delivery_place" 
                className="form-control" 
                placeholder="например: г. Семей, Объект Азия Парк" 
                value={formData.delivery_place || ''} 
                onChange={handleChange}
              />
            </div>

            {/* 6. Краткое описание */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                6. Краткое описание <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 400 }}>(Необязательно)</span>
              </label>
              <textarea name="description" className="form-control" rows="3" placeholder="Укажите особые условия поставки, требования к качеству..." value={formData.description || ''} onChange={handleChange}></textarea>
            </div>
          </div>

          {/* Блок 2: Динамический Конструктор Лотов & Калькулятор НДС (16%) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--pk-primary)', paddingBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, color: 'var(--pk-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📦 Список лотов закупки ({lots.length})
            </h3>
            <button
              type="button"
              className="btn btn-outline"
              style={{ borderColor: 'var(--pk-primary)', color: 'var(--pk-primary)', fontWeight: 600 }}
              onClick={handleAddLot}
            >
              + Добавить Лот №{lots.length + 1}
            </button>
          </div>

          {lots.map((lot, index) => (
            <div key={lot.id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                  Лот №{index + 1}: {lot.title || 'Безымянный лот'}
                </span>
                {lots.length > 1 && (
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                    onClick={() => handleRemoveLot(index)}
                  >
                    🗑️ Удалить лот
                  </button>
                )}
              </div>

              {/* Поля Наименования и Описания */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', color: '#334155' }}>
                    {formData.subject_type === 'goods' ? 'Наименование товара' : 'Наименование услуги / объема работ'} *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={formData.subject_type === 'goods' ? 'например: Цемент марки М500 в мешках по 50кг' : 'например: Капитальный ремонт кровли цеха №2'}
                    value={lot.title}
                    onChange={(e) => handleLotChange(index, 'title', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* КАЛЬКУЛЯТОР ЦЕНЫ И НДС (16%) */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🧮 Калькулятор плановой цены и НДС (16% НДС РК):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', color: '#334155' }}>Количество *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm"
                      value={lot.quantity}
                      onChange={(e) => handleLotChange(index, 'quantity', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', color: '#334155' }}>Ед. измерения *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="шт, тонна, м², услуга"
                      value={lot.unit}
                      onChange={(e) => handleLotChange(index, 'unit', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', color: '#334155' }}>Цена за ед. (₸) *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-control form-control-sm"
                      placeholder="0.00"
                      value={lot.unit_price}
                      onChange={(e) => handleLotChange(index, 'unit_price', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', color: '#334155' }}>Режим НДС *</label>
                    <select
                      className="form-control form-control-sm"
                      value={lot.vat_mode}
                      onChange={(e) => handleLotChange(index, 'vat_mode', e.target.value)}
                    >
                      <option value="include_vat">Включая НДС (16%)</option>
                      <option value="no_vat">Без НДС (0%)</option>
                      <option value="supplier_tax_mode">Учитывать НДС поставщика</option>
                    </select>
                  </div>
                </div>

                {/* Табло автоматического расчета */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: '#ffffff', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #e0f2fe', fontSize: '0.85rem' }}>
                  <div>
                    <span className="text-sec">Сумма без НДС:</span> <strong>{lot.total_price_without_vat?.toLocaleString('ru-RU')} ₸</strong>
                  </div>
                  <div>
                    <span className="text-sec">НДС (16%):</span> <strong style={{ color: '#0284c7' }}>{lot.vat_amount?.toLocaleString('ru-RU')} ₸</strong>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: '0.95rem' }}>
                    <span className="text-sec">Итого плановая сумма лота:</span> <strong style={{ color: '#15803d', fontSize: '1.05rem' }}>{lot.start_price?.toLocaleString('ru-RU')} ₸</strong>
                  </div>
                </div>
              </div>

              {/* УСЛОВИЯ ЛОТА (ДИНАМИЧЕСКИЕ ПОЛЯ ДЛЯ ТОВАРОВ) */}
              {formData.subject_type === 'goods' ? (
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.85rem', border: '1px dashed #cbd5e1', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '0.6rem' }}>
                    📦 Специфика и условия поставки ТОВАРА:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Базис поставки (Incoterms)</label>
                      <select
                        className="form-control form-control-sm"
                        value={lot.incoterms || 'DDP'}
                        onChange={(e) => handleLotChange(index, 'incoterms', e.target.value)}
                      >
                        <option value="DDP">DDP (С доставкой и пошлиной)</option>
                        <option value="EXW">EXW (Самовывоз со склада)</option>
                        <option value="DAP">DAP (До места назначения)</option>
                        <option value="FOB">FOB (Франко-борт)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Авансирование (% предоплаты)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control form-control-sm"
                        placeholder="0 %"
                        value={lot.advance_payment_pct || 0}
                        onChange={(e) => handleLotChange(index, 'advance_payment_pct', e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Срок поставки (дней)</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        placeholder="30"
                        value={lot.delivery_days_count || ''}
                        onChange={(e) => handleLotChange(index, 'delivery_days_count', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* УСЛОВИЯ ЛОТА (ДИНАМИЧЕСКИЕ ПОЛЯ ДЛЯ УСЛУГ / РАБОТ) */
                <div style={{ background: '#fdf4ff', borderRadius: '8px', padding: '0.85rem', border: '1px dashed #f0abfc', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#86198f', marginBottom: '0.6rem' }}>
                    🛠️ График и гарантии для УСЛУГ / РАБОТ:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Дата начала работ</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={lot.service_start_date || ''}
                        onChange={(e) => handleLotChange(index, 'service_start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Дата завершения работ</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={lot.service_end_date || ''}
                        onChange={(e) => handleLotChange(index, 'service_end_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>Гарантийный срок (в месяцах)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="12 месяцев"
                        value={lot.warranty_months || 12}
                        onChange={(e) => handleLotChange(index, 'warranty_months', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Блок 3: Документация */}
          <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>{t('section_3') || '3. Документация закупки'}</h4>
          
          <input 
            type="file" 
            ref={psdInputRef} 
            style={{ display: 'none' }} 
            multiple 
            accept=".pdf,.zip,.rar,.7z,.doc,.docx"
            onChange={(e) => {
              if (e.target.files?.length) {
                handlePsdFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <input 
            type="file" 
            ref={contractInputRef} 
            style={{ display: 'none' }} 
            multiple 
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleContractFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Карточка ПСД */}
            <div 
              className="file-upload-box" 
              onClick={() => psdInputRef.current?.click()}
              onDragOver={handlePsdDragOver}
              onDragLeave={handlePsdDragLeave}
              onDrop={handlePsdDrop}
              style={{ 
                border: isPsdDragging ? '2px dashed var(--pk-primary)' : '2px dashed #93c5fd', 
                backgroundColor: isPsdDragging ? '#eff6ff' : '#f0f9ff',
                padding: '1.5rem', 
                textAlign: 'center', 
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isPsdDragging ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <UploadCloud size={36} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong style={{ fontSize: '1rem', color: '#0f172a' }}>{t('psd_doc') || 'Проектно-сметная документация (ПСД)'}</strong></div>
              <div className="text-sm text-sec" style={{ margin: '0.25rem 0 0.75rem' }}>Нажмите или перетащите файлы сюда (PDF, ZIP, RAR)</div>

              {psdFiles.length > 0 && (
                <div style={{ marginTop: '1rem', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                  {psdFiles.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <FileText size={16} color="var(--pk-primary)" />
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({f.size})</span>
                      </div>
                      <button type="button" onClick={() => removePsdFile(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Карточка Проекта договора */}
            <div 
              className="file-upload-box" 
              onClick={() => contractInputRef.current?.click()}
              onDragOver={handleContractDragOver}
              onDragLeave={handleContractDragLeave}
              onDrop={handleContractDrop}
              style={{ 
                border: isContractDragging ? '2px dashed var(--pk-primary)' : '2px dashed #cbd5e1', 
                backgroundColor: isContractDragging ? '#f8fafc' : '#ffffff',
                padding: '1.5rem', 
                textAlign: 'center', 
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isContractDragging ? '0 0 12px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <UploadCloud size={36} color="var(--pk-primary)" style={{ marginBottom: '0.5rem' }} />
              <div><strong style={{ fontSize: '1rem', color: '#0f172a' }}>{t('contract_draft_doc') || 'Проект договора'}</strong></div>
              <div className="text-sm text-sec" style={{ margin: '0.25rem 0 0.75rem' }}>Нажмите или перетащите файлы сюда (DOCX, PDF)</div>

              {contractFiles.length > 0 && (
                <div style={{ marginTop: '1rem', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                  {contractFiles.map(f => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <FileText size={16} color="var(--pk-primary)" />
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({f.size})</span>
                      </div>
                      <button type="button" onClick={() => removeContractFile(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Блок 4: Настройка Квалификационного отбора и Лицензирования (Модуль 3.2) */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
            <h4 style={{ margin: 0, marginBottom: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📜 Настройка Квалификационного отбора и Лицензирования (Модуль 3.2)
            </h4>

            {/* Фильтр Лицензии */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  style={{ width: '18px', height: '18px' }}
                  checked={requiresLicense}
                  onChange={(e) => setRequiresLicense(e.target.checked)}
                />
                🔒 Требуется государственная лицензия / разрешение на деятельность
              </label>

              {requiresLicense && (
                <div style={{ marginTop: '0.85rem', paddingLeft: '1.8rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
                    Категория лицензии / разрешения:
                  </label>
                  <select
                    className="form-control"
                    value={licenseCategory}
                    onChange={(e) => setLicenseCategory(e.target.value)}
                  >
                    <option value="Строительно-монтажные работы (СМР) I категории">Строительно-монтажные работы (СМР) I категории</option>
                    <option value="Строительно-монтажные работы (СМР) II категории">Строительно-монтажные работы (СМР) II категории</option>
                    <option value="Строительно-монтажные работы (СМР) III категории">Строительно-монтажные работы (СМР) III категории</option>
                    <option value="Проектно-изыскательская деятельность">Проектно-изыскательская деятельность</option>
                    <option value="Экологический аудит и проектирование">Экологический аудит и проектирование</option>
                    <option value="Монтаж и эксплуатация систем пожарной безопасности">Монтаж и эксплуатация систем пожарной безопасности</option>
                  </select>
                </div>
              )}
            </div>

            {/* Конструктор квалификационных требований */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>
                  Перечень документов квалификации для загрузки Поставщиком:
                </label>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: '#0284c7', color: '#0284c7' }}
                  onClick={handleAddQualReq}
                >
                  + Добавить требование
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {qualRequirements.map((q) => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <input
                        type="checkbox"
                        checked={q.is_mandatory}
                        onChange={() => handleToggleQualMandatory(q.id)}
                        title="Пометить как обязательный документ"
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>
                        {q.title}
                      </span>
                      {q.is_mandatory ? (
                        <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem' }}>🔒 Обязательно</span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem' }}>Опционально</span>
                      )}
                    </div>

                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                      onClick={() => handleRemoveQualReq(q.id)}
                      title="Удалить требование"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)} style={{ flex: 1, justifyContent: 'center' }}>
              {t('btn_cancel') || 'Отмена'}
            </button>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={(e) => handleFormSubmit(e, 'draft')} 
              style={{ flex: 1.5, justifyContent: 'center', borderColor: '#0284c7', color: '#0284c7', fontWeight: 600 }}
              disabled={isSubmitting}
            >
              💾 {t('btn_save_draft') || 'Сохранить как черновик'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={(e) => handleFormSubmit(e, 'publish')} 
              style={{ flex: 2, justifyContent: 'center' }} 
              disabled={isSubmitting}
            >
              🚀 {t('btn_publish_now') || 'Опубликовать'}
            </button>
          </div>
        </form>
        )}
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
