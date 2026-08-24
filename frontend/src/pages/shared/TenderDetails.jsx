import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, FileText, CheckCircle2, Download, Upload, Trash2, Package, Calendar, MapPin, Award, ArrowLeft, RefreshCw, Send, Check, Building2, UserCheck, Mail, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, bidsAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const formatPriceKzt = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  const num = Number(amount);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const isSupplierCabinet = location.pathname.startsWith('/supplier/');
  
  const [tender, setTender] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'lots', 'docs', 'protocols', 'contracts', 'appeals'
  const [myBid, setMyBid] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [techSpecNotes, setTechSpecNotes] = useState('');
  const [selectedLotIds, setSelectedLotIds] = useState([]);
  const [lotPrices, setLotPrices] = useState({});
  const [lotSpecs, setLotSpecs] = useState({});
  const [supplierFiles, setSupplierFiles] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [selectedVaultDocIds, setSelectedVaultDocIds] = useState([]);
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [showBidFormModal, setShowBidFormModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTenderAndBids();
    loadVaultDocs();
  }, [id]);

  const effectiveLots = (tender?.lots && tender.lots.length > 0)
    ? tender.lots
    : [
        { id: 1, lot_number: 1, title: `${tender?.title || 'Поставка оборудования'} (Лот №1)`, quantity: 1, unit: 'шт', unit_price: Math.round((tender?.start_price || 3000000) * 0.6), start_price: Math.round((tender?.start_price || 3000000) * 0.6), delivery_place: tender?.delivery_place || 'г. Алматы' },
        { id: 2, lot_number: 2, title: 'Комплектующие материалы и расходники (Лот №2)', quantity: 1, unit: 'компл', unit_price: Math.round((tender?.start_price || 3000000) * 0.25), start_price: Math.round((tender?.start_price || 3000000) * 0.25), delivery_place: tender?.delivery_place || 'г. Алматы' },
        { id: 3, lot_number: 3, title: 'Услуги монтажа, настройки и гарантийного обслуживания (Лот №3)', quantity: 1, unit: 'услуга', unit_price: Math.round((tender?.start_price || 3000000) * 0.15), start_price: Math.round((tender?.start_price || 3000000) * 0.15), delivery_place: tender?.delivery_place || 'г. Алматы' }
      ];

  useEffect(() => {
    if (tender) {
      const lotsToUse = (tender.lots && tender.lots.length > 0)
        ? tender.lots
        : [
            { id: 1, lot_number: 1, title: `${tender.title || 'Поставка оборудования'} (Лот №1)`, start_price: Math.round((tender.start_price || 3000000) * 0.6) },
            { id: 2, lot_number: 2, title: 'Комплектующие материалы и расходники (Лот №2)', start_price: Math.round((tender.start_price || 3000000) * 0.25) },
            { id: 3, lot_number: 3, title: 'Услуги монтажа, настройки и гарантийного обслуживания (Лот №3)', start_price: Math.round((tender.start_price || 3000000) * 0.15) }
          ];

      const allIds = lotsToUse.map((l, idx) => l.id || idx + 1);
      setSelectedLotIds(allIds);
      const initPrices = {};
      const initSpecs = {};
      let total = 0;
      lotsToUse.forEach((l, idx) => {
        const lotId = l.id || idx + 1;
        const priceVal = l.start_price || l.unit_price || 0;
        initPrices[lotId] = priceVal;
        initSpecs[lotId] = '';
        total += priceVal;
      });
      setLotPrices(initPrices);
      setLotSpecs(initSpecs);
      setBidPrice(total);
    }
  }, [tender]);

  const toggleLotSelection = (lotId) => {
    let nextIds = [];
    if (selectedLotIds.includes(lotId)) {
      nextIds = selectedLotIds.filter(i => i !== lotId);
    } else {
      nextIds = [...selectedLotIds, lotId];
    }
    setSelectedLotIds(nextIds);
    const total = nextIds.reduce((sum, idKey) => sum + Number(lotPrices[idKey] || 0), 0);
    setBidPrice(total || '');
  };

  const loadVaultDocs = () => {
    try {
      const saved = localStorage.getItem('supplier_vault_docs');
      if (saved) {
        setVaultDocs(JSON.parse(saved));
      } else {
        const defaultVault = [
          { id: 1, name: 'Лицензия на СМР (1 категории)', category: 'Лицензии', date: '12.01.2024', size: '2.4 МБ', format: 'PDF' },
          { id: 2, name: 'Справка об отсутствии налоговой задолженности', category: 'Налоги', date: '15.08.2024', size: '1.1 МБ', format: 'PDF' },
          { id: 3, name: 'Свидетельство о государственной регистрации ТОО', category: 'Учредительные', date: '10.02.2024', size: '850 КБ', format: 'PDF' }
        ];
        setVaultDocs(defaultVault);
      }
    } catch (e) {}
  };

  const toggleVaultDoc = (doc) => {
    if (selectedVaultDocIds.includes(doc.id)) {
      setSelectedVaultDocIds(prev => prev.filter(id => id !== doc.id));
      setSupplierFiles(prev => prev.filter(f => f.vaultId !== doc.id));
    } else {
      setSelectedVaultDocIds(prev => [...prev, doc.id]);
      setSupplierFiles(prev => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          vaultId: doc.id,
          name: `${doc.name}.${doc.format ? doc.format.toLowerCase() : 'pdf'}`,
          size: 1024 * 1024,
          category: doc.category || 'Хранилище Поставщика',
          file_path: `/uploads/vault/${doc.id}/${doc.name}`
        }
      ]);
      toast.success(`Документ "${doc.name}" прикреплен из Хранилища!`);
    }
  };

  const fetchTenderAndBids = async () => {
    try {
      const res = await tendersAPI.get(id);
      setTender(res.data);
      if (res.data.start_price && (!res.data.lots || res.data.lots.length <= 1)) {
        setBidPrice(res.data.start_price);
      }

      if (user?.role === 'supplier') {
        try {
          const bidsRes = await bidsAPI.myBids();
          const existing = (bidsRes.data || []).find(b => b.tender_id === Number(id) && b.status !== 'rejected');
          if (existing) {
            setMyBid(existing);
          }
        } catch (e) {
          console.warn("Notice checking my bids:", e);
        }
      }
    } catch (error) {
      toast.error('Закупка не найдена');
      navigate('/public-tenders');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      category: 'Квалификационные документы и коммерческое предложение',
      file_path: `/uploads/bids/${tender?.id}/${file.name}`
    }));

    setSupplierFiles(prev => [...prev, ...newDocs]);
    toast.success(`Прикреплено файлов: ${files.length}`);
  };

  const handleRemoveFile = (fileId) => {
    setSupplierFiles(prev => prev.filter(f => f.id !== fileId));
    toast.success('Файл удален из заявки');
  };

  const handleSubmitClick = (e) => {
    if (e) e.preventDefault();
    const priceNum = Number(bidPrice);
    if (!bidPrice || isNaN(priceNum) || priceNum <= 0) {
      toast.error('Введите корректное ценовое предложение');
      return;
    }
    if (priceNum >= tender.start_price) {
      toast.error(`Ваше ценовое предложение должно быть строго ниже стартовой суммы (${formatPriceKzt(tender.start_price)} ₸)`);
      return;
    }
    if (tender?.lots && tender.lots.length > 1 && selectedLotIds.length === 0) {
      toast.error('Выберите хотя бы 1 лот для участия в закупке');
      return;
    }
    setShowEdsModal(true);
  };

  const processBidSubmission = async (signedCms) => {
    setIsSubmitting(true);
    try {
      const itemsPayload = (tender?.lots && tender.lots.length > 0)
        ? selectedLotIds.map(lotId => ({
            lot_id: lotId,
            price: Number(lotPrices[lotId] || 0),
            proposed_tech_spec: lotSpecs[lotId] || techSpecNotes || ""
          }))
        : [];

      const payload = {
        tender_id: tender.id,
        price: Number(bidPrice),
        tech_spec_notes: techSpecNotes,
        eds_hash: signedCms || "demo_signed_hash_supplier_12345",
        items: itemsPayload,
        documents: supplierFiles.map(f => ({
          file_name: f.name,
          doc_type: f.category,
          file_size: f.size,
          file_path: f.file_path,
          hash_sha256: `sha256_bid_${tender.id}_${f.name}`
        }))
      };

      const res = await bidsAPI.submit(payload);
      setMyBid(res.data);
      toast.success('Заявка и техническая спецификация успешно подписаны ЭЦП и поданы!');
      fetchTenderAndBids();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Ошибка при подаче заявки');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
      setShowBidFormModal(false);
    }
  };

  if (!tender) {
    return (
      <div style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
        <p className="text-sec">Загрузка информации об объявлении...</p>
      </div>
    );
  }

  const tenderNumber = tender.number || `17522776-${tender.id}`;
  const tenderTitle = tender.title || 'Приобретение интерактивной панели';
  const isGoods = tender.subject_type === 'goods';
  const organizerName = tender.company_name || tender.organizer_name || '250840008054 КГУ "Общеобразовательная школа № 215" Управления образования города Алматы';
  const pubDate = tender.created_at ? new Date(tender.created_at).toLocaleString('ru-RU') : '2026-08-24 23:44:51';
  const startDate = tender.start_date ? new Date(tender.start_date).toLocaleString('ru-RU') : '2026-08-25 08:44:27';
  const deadlineDate = tender.deadline_at ? new Date(tender.deadline_at).toLocaleString('ru-RU') : '2026-08-27 09:44:35';
  const totalSum = formatPriceKzt(tender.start_price || tender.budget || 3204310.35);

  return (
    <div className="fade-in container" style={{ padding: '1.5rem 1rem', maxWidth: '1280px' }}>
      
      {/* Кнопка "Назад в реестр" */}
      <div style={{ marginBottom: '1rem' }}>
        <Link 
          to="/public-tenders" 
          className="btn btn-outline btn-sm" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#475569', borderColor: '#cbd5e1', textDecoration: 'none', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Назад в Реестр объявлений
        </Link>
      </div>

      {/* 1. ВЕРХНИЙ ЗАГОЛОВОК ОБЪЯВЛЕНИЯ (СТАП ГОСЗААКУПКИ) */}
      <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', borderRadius: '4px 4px 0 0' }}>
        Просмотр объявления № {tenderNumber}
      </div>

      {/* 2. СЕТКА ОСНОВНЫХ СВЕДЕНИЙ (СЕРЫЕ ИНПУТЫ ИЗ СКРИНШОТА) */}
      <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderTop: 'none', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem 2rem' }}>
          
          {/* Левая колонка */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Номер объявления</span>
              <input type="text" readOnly className="form-control" value={tenderNumber} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Наименование объявления</span>
              <input type="text" readOnly className="form-control" value={tenderTitle} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Статус объявления</span>
              <input type="text" readOnly className="form-control" value={tender.status === 'published' ? 'Опубликовано' : 'Прием заявок'} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Дата публикации объявления</span>
              <input type="text" readOnly className="form-control" value={pubDate} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }} />
            </div>
          </div>

          {/* Правая колонка */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Срок начала приема заявок</span>
              <input type="text" readOnly className="form-control" value={startDate} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 600, fontSize: '0.85rem', color: '#334155' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Срок окончания приема заявок</span>
              <input type="text" readOnly className="form-control" value={deadlineDate} style={{ background: '#e2e8f0', borderColor: '#cbd5e1', fontWeight: 700, fontSize: '0.85rem', color: '#dc2626' }} />
            </div>
          </div>

        </div>
      </div>

      {/* Основной контент (строго фикс-размер без скачков ширины) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start', width: '100%' }}>
        
        {/* ЛЕВАЯ ЧАСТЬ: ТАБЫ И СОДЕРЖИМОЕ (ЕГО ШИРИНА СТРОГО 100% И НИКОГДА НЕ ИЗМЕНЯЕТСЯ) */}
        <div style={{ minWidth: 0, width: '100%' }}>
          
          {/* 3. НАВИГАЦИОННЫЕ ТАБЫ (ПЛОТНО ПРИЛЕГАЮТ К ЕДИНОЙ КАРТОЧКЕ) */}
          <div style={{ display: 'flex', borderBottom: '2px solid #cbd5e1', marginBottom: 0, flexWrap: 'nowrap', overflowX: 'auto', gap: '0.2rem' }}>
            <button 
              type="button"
              onClick={() => setActiveTab('general')}
              style={{ padding: '0.75rem 1.35rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'general' ? '3px solid #0284c7' : '1px solid #cbd5e1', background: activeTab === 'general' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'general' ? 800 : 600, color: activeTab === 'general' ? '#0284c7' : '#64748b', cursor: 'pointer', borderRadius: '8px 8px 0 0', marginBottom: '-2px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
            >
              Общие сведения
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('lots')}
              style={{ padding: '0.75rem 1.35rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'lots' ? '3px solid #0284c7' : '1px solid #cbd5e1', background: activeTab === 'lots' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'lots' ? 800 : 600, color: activeTab === 'lots' ? '#0284c7' : '#64748b', cursor: 'pointer', borderRadius: '8px 8px 0 0', marginBottom: '-2px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
            >
              Лоты ({tender.lots?.length || 1})
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('docs')}
              style={{ padding: '0.75rem 1.35rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'docs' ? '3px solid #0284c7' : '1px solid #cbd5e1', background: activeTab === 'docs' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'docs' ? 800 : 600, color: activeTab === 'docs' ? '#0284c7' : '#64748b', cursor: 'pointer', borderRadius: '8px 8px 0 0', marginBottom: '-2px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
            >
              Документация
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('protocols')}
              style={{ padding: '0.75rem 1.35rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'protocols' ? '3px solid #0284c7' : '1px solid #cbd5e1', background: activeTab === 'protocols' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'protocols' ? 800 : 600, color: activeTab === 'protocols' ? '#0284c7' : '#64748b', cursor: 'pointer', borderRadius: '8px 8px 0 0', marginBottom: '-2px', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
            >
              Протоколы
            </button>
          </div>

          {/* ЕДИНЫЙ МОНОЛИТНЫЙ КОНТЕЙНЕР ДЛЯ ВСЕХ ВКЛАДОК (ОДИНАКОВАЯ ШИРИНА 100%, ГРАНИЦЫ И ПАДДИНГ) */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderTop: 'none', padding: '1.5rem', borderRadius: '0 0 10px 10px', minHeight: '380px', width: '100%', boxSizing: 'border-box' }}>
            
            {/* TAB 1: ОБЩИЕ СВЕДЕНИЯ */}
            {activeTab === 'general' && (
              <div className="fade-in" style={{ width: '100%' }}>
                {/* Таблица 1: Общие сведения */}
                <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                  <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>
                    Общие сведения
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', tableLayout: 'fixed' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ width: '220px', padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Способ проведения закупки
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          Запрос ценовых предложений
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Тип закупки
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          Первая закупка
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Вид предмета закупок
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          {isGoods ? 'Товар' : 'Услуги / Работы'}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Организатор
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 500, wordBreak: 'break-word' }}>
                          {organizerName}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Юр. адрес организатора
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          751410000, KAZAKHSTAN, г. Алматы, ул. ЛЕВИТАНА, д. 20, оф. 4
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Кол-во лотов в объявлении
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 700 }}>
                          {tender.lots?.length || 1}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Сумма закупки
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.95rem' }}>
                          {totalSum} ₸
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Признаки
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                          • Без учета НДС
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Таблица 2: Информация об организаторе */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                  <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>
                    Информация об организаторе
                  </div>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', tableLayout: 'fixed' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ width: '220px', padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          ФИО представителя
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 600, wordBreak: 'break-word' }}>
                          ОРАЗАЛИЕВА ЖАНАР МАУТХАНОВНА
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          Должность
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0f172a', wordBreak: 'break-word' }}>
                          Руководитель
                        </td>
                      </tr>

                      <tr>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                          E-Mail
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#0284c7', fontWeight: 600, wordBreak: 'break-word' }}>
                          Orazalieva1976@mail.ru
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: ЛОТЫ */}
            {activeTab === 'lots' && (
              <div className="fade-in" style={{ width: '100%' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', width: '100%', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem 0.75rem', width: '70px' }}>№ ЛОТА</th>
                        <th style={{ padding: '0.75rem 0.75rem' }}>НАИМЕНОВАНИЕ ЛОТА</th>
                        <th style={{ padding: '0.75rem 0.75rem', width: '85px' }}>КОЛ-ВО</th>
                        <th style={{ padding: '0.75rem 0.75rem', width: '120px' }}>ЦЕНА ЗА ЕД., ТГ.</th>
                        <th style={{ padding: '0.75rem 0.75rem', width: '130px' }}>СУММА, ТГ.</th>
                        <th style={{ padding: '0.75rem 0.75rem', width: '120px' }}>МЕСТО ПОСТАВКИ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tender.lots && tender.lots.length > 0 ? tender.lots : [{
                        lot_number: 1,
                        title: tenderTitle,
                        quantity: 1,
                        unit_price: tender.start_price || 1000000,
                        start_price: tender.start_price || 1000000,
                        delivery_place: 'Алматы'
                      }]).map((lot, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: 'var(--pk-primary)' }}>
                            {lot.lot_number || idx + 1}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>
                            {lot.title}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700 }}>
                            {lot.quantity} {lot.unit || 'лот'}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', whiteSpace: 'nowrap' }}>
                            {formatPriceKzt(lot.unit_price)}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>
                            {formatPriceKzt(lot.start_price)}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', color: '#475569', wordBreak: 'break-word' }}>
                            {lot.delivery_place || 'Алматы'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: ДОКУМЕНТАЦИЯ */}
            {activeTab === 'docs' && (
              <div className="fade-in" style={{ width: '100%' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a' }}>
                  📁 Прилагаемая документация и проект договора
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  {tender.documents && tender.documents.length > 0 ? (
                    tender.documents.map((doc, i) => (
                      <a
                        key={doc.id || i}
                        href={doc.file_path || '#'}
                        download={doc.file_name}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px', width: '100%', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                      >
                        <FileText size={24} color="#0284c7" />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            📄 {doc.file_name}
                          </div>
                          <div className="text-sm text-sec" style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                            {doc.doc_type || 'Документ закупки'} • {Math.round((doc.file_size || 1024) / 1024)} KB
                          </div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <>
                      <a 
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ ОБЩЕСТВА № ${tenderNumber}\n\nНаименование: ${tenderTitle}\nЗаказчик: ${organizerName}`)}`}
                        download={`Техническая_Спецификация_${tenderNumber}.txt`}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px', width: '100%', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                      >
                        <FileText size={24} color="#0284c7" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            📄 Техническая спецификация.pdf
                          </div>
                          <div className="text-sm text-sec" style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                            Параметры и ГОСТ
                          </div>
                        </div>
                      </a>

                      <a 
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ПРОЕКТ ДОГОВОРА ПО ЗАКУПКЕ № ${tenderNumber}\n\n1. Предмет договора: ${tenderTitle}\n2. Заказчик: ${organizerName}`)}`}
                        download={`Проект_Договора_${tenderNumber}.txt`}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.25rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px', width: '100%', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                      >
                        <FileText size={24} color="#16a34a" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            📄 Проект договора.pdf
                          </div>
                          <div className="text-sm text-sec" style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                            Условия и контракт
                          </div>
                        </div>
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ПРОТОКОЛЫ */}
            {activeTab === 'protocols' && (
              <div className="fade-in" style={{ width: '100%' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a' }}>
                  📜 Официальные протоколы закупки
                </h4>
                <p className="text-sec" style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                  Протоколы вскрытия заявки и подведения итогов подписываются ЭЦП KalkanCrypt.
                </p>
                
                {tender.status === 'cancelled' || (tender.bids && tender.bids.length === 0 && new Date(tender.deadline_at) <= new Date()) ? (
                  <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#be123c', fontSize: '0.95rem' }}>
                          Протокол итогов (Закупка не состоялась) № P-FAILED-{tender.id}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#9f1239', marginTop: '0.25rem' }}>
                          Причина: {tender.cancellation_reason || "Закупка признана несостоявшейся в связи с отсутствием поданных заявок от потенциальных поставщиков."}
                        </div>
                      </div>
                      <span className="badge" style={{ backgroundColor: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                        ❌ Не состоялась (0 заявок)
                      </span>
                    </div>

                    <a
                      href={`/api/v1/tenders/${tender.id}/protocol/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ background: '#ffffff', color: '#be123c', borderColor: '#fca5a5', fontWeight: 700, fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <FileText size={16} style={{ marginRight: '0.4rem' }} /> Скачать протокол итогов (PDF / HTML)
                    </a>
                  </div>
                ) : (
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Протокол вскрытия № P-{tender.id || 1}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>Статус: Сформирован и заверен ЭЦП</div>
                    </div>
                    <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.3rem 0.6rem' }}>
                      ✓ Подписан ЭЦП
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: ДЛЯ АВТОРИЗОВАННОГО ПОСТАВЩИКА В КАБИНЕТЕ - ЕДИНСТВЕННАЯ КНОПКА ПОДАЧИ, ОТКРЫВАЮЩАЯ ПОЛНОРАЗМЕРНОЕ ОКНО */}
        <div className="card" style={{ padding: '1.25rem', border: isSupplierCabinet ? '2px solid var(--pk-primary)' : '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          {isSupplierCabinet ? (
            <>
              {myBid ? (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <CheckCircle2 size={36} color="#15803d" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>Заявка успешно подана!</div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.35rem' }}>
                    Ваша цена: <strong>{formatPriceKzt(myBid.price)} ₸</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.4rem' }}>
                    Заверено подписью ЭЦП KalkanCrypt
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <div style={{ background: '#eff6ff', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                    <Send size={26} color="var(--pk-primary)" />
                  </div>
                  <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                    Подача ценового предложения
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                    Вы авторизованы как Поставщик. Для заполнения расчёта по лотам, прикрепления документов и подписи ЭЦП нажмите кнопку ниже:
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowBidFormModal(true)}
                    style={{ width: '100%', justifyContent: 'center', padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.95rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Send size={18} /> ⚡ Подать заявку на участие
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ background: '#eff6ff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <ShieldCheck size={26} color="var(--pk-primary)" />
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                Участие в закупке
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.45 }}>
                Для подачи ценового предложения и загрузки квалификационных документов необходимо авторизоваться по ЭЦП или зарегистрироваться в качестве Поставщика.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowEdsModal(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontWeight: 800, fontSize: '0.88rem' }}
                >
                  🔑 Авторизация по ЭЦП
                </button>

                <Link
                  to="/login"
                  className="btn btn-outline"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', fontWeight: 700, fontSize: '0.85rem', color: '#0284c7', borderColor: '#38bdf8', textDecoration: 'none' }}
                >
                  📝 Регистрация / Авторизация
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ПОЛНОРАЗМЕРНОЕ МОДАЛЬНОЕ ОКНО ПОДАЧИ ЗАЯВКИ */}
      {showBidFormModal && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div 
            className="modal-content fade-in" 
            style={{ width: '960px', maxWidth: '98%', maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #cbd5e1', padding: 0 }}
          >
            {/* Заголовок модального окна */}
            <div style={{ padding: '1.25rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={22} color="var(--pk-primary)" /> Полноразмерная форма подачи заявки на участие
                </h3>
                <div style={{ fontSize: '0.83rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Закупка № <strong>{tenderNumber}</strong> — {tenderTitle}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowBidFormModal(false)}
                style={{ border: 'none', background: '#e2e8f0', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', transition: 'all 0.15s ease' }}
                title="Закрыть окно"
              >
                <X size={20} />
              </button>
            </div>

            {/* Тело модальной формы */}
            <form onSubmit={handleSubmitClick} style={{ padding: '1.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                
                {/* Блок 1: Полотовой выбор */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.1rem', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      📦 Выберите лоты для участия ({selectedLotIds.length} из {effectiveLots.length}):
                    </label>
                    <span style={{ fontSize: '0.74rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 700 }}>
                      Полотовой расчёт
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    Отметьте галочками нужные лоты, укажите цены и спецификации предлагаемого товара по каждому лоту:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                    {effectiveLots.map((lot, idx) => {
                      const lotId = lot.id || idx + 1;
                      const isChecked = selectedLotIds.includes(lotId);
                      return (
                        <div 
                          key={lotId} 
                          style={{ padding: '0.75rem', border: `1px solid ${isChecked ? '#3b82f6' : '#cbd5e1'}`, borderRadius: '8px', background: isChecked ? '#ffffff' : '#f1f5f9', boxShadow: isChecked ? '0 2px 4px rgba(59,130,246,0.08)' : 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={() => toggleLotSelection(lotId)}>
                            <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.86rem', color: isChecked ? '#1d4ed8' : '#334155' }}>
                              Лот №{lot.lot_number || idx + 1}: {lot.title}
                            </span>
                          </div>

                          {isChecked && (
                            <div style={{ marginTop: '0.6rem', paddingLeft: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', borderLeft: '3px solid #3b82f6' }}>
                              <div>
                                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                                  Предложенная цена по лоту №{lot.lot_number || idx + 1} (₸):
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={lotPrices[lotId] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLotPrices(prev => ({ ...prev, [lotId]: val }));
                                    const newPrices = { ...lotPrices, [lotId]: val };
                                    const total = selectedLotIds.reduce((sum, idKey) => sum + Number(newPrices[idKey] || 0), 0);
                                    setBidPrice(total ? Math.round(total * 0.95) : '');
                                  }}
                                  placeholder="Цена за лот"
                                  style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                                  Спецификация / Аналог товара по лоту №{lot.lot_number || idx + 1}:
                                </label>
                                <textarea
                                  className="form-control form-control-sm"
                                  rows={2}
                                  value={lotSpecs[lotId] || ''}
                                  onChange={(e) => setLotSpecs(prev => ({ ...prev, [lotId]: e.target.value }))}
                                  placeholder="Параметры предлагаемого товара по этому лоту..."
                                  style={{ fontSize: '0.88rem' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Блок 2: Общая цена & Общая спецификация */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.1rem', background: '#ffffff' }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>
                      💰 Итоговое ценовое предложение (тенге):
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Укажите итоговую сумму"
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--pk-primary)', padding: '0.65rem 0.85rem' }}
                      required
                    />
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
                      Стартовый бюджет закупки: <strong>{totalSum} ₸</strong>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.1rem', background: '#ffffff', flex: 1 }}>
                    <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.35rem' }}>
                      📝 Общая техническая спецификация / Комментарий к закупке:
                    </label>
                    <textarea
                      className="form-control"
                      rows={5}
                      placeholder="Укажите общие технические характеристики предлагаемых товаров/услуг, ГОСТ, гарантийный срок или коммерческие условия..."
                      value={techSpecNotes}
                      onChange={(e) => setTechSpecNotes(e.target.value)}
                      style={{ fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </div>

              </div>

              {/* Блок 3: Документы */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.1rem', background: '#ffffff', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                  📁 Прикрепление квалификационных документов
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                      Выберите из вашего Хранилища:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '140px', overflowY: 'auto' }}>
                      {vaultDocs.map((doc) => {
                        const isSelected = selectedVaultDocIds.includes(doc.id);
                        return (
                          <div 
                            key={doc.id}
                            onClick={() => toggleVaultDoc(doc)}
                            style={{ padding: '0.5rem 0.75rem', border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`, background: isSelected ? '#eff6ff' : '#ffffff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span style={{ fontWeight: 600, color: isSelected ? '#1d4ed8' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doc.name}
                            </span>
                            {isSelected && <Check size={16} color="#1d4ed8" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                      Загрузить файлы с компьютера:
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="form-control"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
                    />
                    {supplierFiles.length > 0 && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {supplierFiles.map(f => (
                          <div key={f.id} style={{ fontSize: '0.78rem', color: '#166534', background: '#f0fdf4', padding: '0.3rem 0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📎 {f.name}</span>
                            <Trash2 size={13} color="#dc2626" style={{ cursor: 'pointer' }} onClick={() => handleRemoveFile(f.id)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Кнопки управления модального окна */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowBidFormModal(false)}
                  style={{ padding: '0.75rem 1.6rem', fontWeight: 700, fontSize: '0.9rem' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2.2rem', fontWeight: 800, fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
                  disabled={isSubmitting}
                >
                  <ShieldCheck size={20} /> Подписать ЭЦП и подать заявку
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ЭЦП Модалка */}
      <EcpModal 
        isOpen={showEdsModal}
        onClose={() => setShowEdsModal(false)}
        onSign={processBidSubmission}
        docTitle={`Подача ценового предложения по закупке № ${tenderNumber}`}
        action="submit_bid"
        targetId={tender.id}
      />
    </div>
  );
};

export default TenderDetails;
