import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, FileText, CheckCircle2, Download, Upload, Trash2, Package, Calendar, MapPin, Award, ArrowLeft, RefreshCw, Send, Check, Building2, UserCheck, Mail, AlertTriangle } from 'lucide-react';
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
  const { user } = useAuthStore();
  
  const [tender, setTender] = useState(null);
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'lots', 'docs', 'protocols', 'contracts', 'appeals'
  const [myBid, setMyBid] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [supplierFiles, setSupplierFiles] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [selectedVaultDocIds, setSelectedVaultDocIds] = useState([]);
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTenderAndBids();
    loadVaultDocs();
  }, [id]);

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
      if (res.data.start_price) {
        setBidPrice(Math.round(res.data.start_price * 0.95));
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
    setShowEdsModal(true);
  };

  const processBidSubmission = async (signedCms) => {
    setIsSubmitting(true);
    try {
      const payload = {
        tender_id: tender.id,
        price: Number(bidPrice),
        eds_hash: signedCms || "demo_signed_hash_supplier_12345",
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
      toast.success('Заявка и коммерческое предложение успешно подписаны ЭЦП и поданы!');
      fetchTenderAndBids();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Ошибка при подаче заявки');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
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

      {/* Основной контент с боковой панелью подачи заявки */}
      <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'supplier' ? '1fr 360px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* ЛЕВАЯ ЧАСТЬ: ТАБЫ И СОДЕРЖИМОЕ ИЗ СКРИНШОТОВ */}
        <div>
          {/* 3. НАВИГАЦИОННЫЕ ТАБЫ ИЗ СКРИНШОТА */}
          <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.2rem' }}>
            <button 
              type="button"
              onClick={() => setActiveTab('general')}
              style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'general' ? '2px solid #ffffff' : '1px solid #cbd5e1', background: activeTab === 'general' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'general' ? 700 : 500, color: activeTab === 'general' ? '#0f172a' : '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0', marginBottom: '-1px', fontSize: '0.85rem' }}
            >
              Общие сведения
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('lots')}
              style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'lots' ? '2px solid #ffffff' : '1px solid #cbd5e1', background: activeTab === 'lots' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'lots' ? 700 : 500, color: activeTab === 'lots' ? '#0f172a' : '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0', marginBottom: '-1px', fontSize: '0.85rem' }}
            >
              Лоты ({tender.lots?.length || 1})
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('docs')}
              style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'docs' ? '2px solid #ffffff' : '1px solid #cbd5e1', background: activeTab === 'docs' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'docs' ? 700 : 500, color: activeTab === 'docs' ? '#0f172a' : '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0', marginBottom: '-1px', fontSize: '0.85rem' }}
            >
              Документация
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('protocols')}
              style={{ padding: '0.65rem 1.25rem', border: '1px solid #cbd5e1', borderBottom: activeTab === 'protocols' ? '2px solid #ffffff' : '1px solid #cbd5e1', background: activeTab === 'protocols' ? '#ffffff' : '#f8fafc', fontWeight: activeTab === 'protocols' ? 700 : 500, color: activeTab === 'protocols' ? '#0f172a' : '#64748b', cursor: 'pointer', borderRadius: '4px 4px 0 0', marginBottom: '-1px', fontSize: '0.85rem' }}
            >
              Протоколы
            </button>
          </div>

          {/* TAB 1: ОБЩИЕ СВЕДЕНИЯ (ТОЧНАЯ КОПИЯ СКРИНШОТА 2) */}
          {activeTab === 'general' && (
            <div className="fade-in">
              {/* Таблица 1: Общие сведения */}
              <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>
                  Общие сведения
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ width: '220px', padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Способ проведения закупки
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                        Запрос ценовых предложений
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Тип закупки
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                        Первая закупка
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Вид предмета закупок
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                        {isGoods ? 'Товар' : 'Услуги / Работы'}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Организатор
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 500 }}>
                        {organizerName}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Юр. адрес организатора
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
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
              <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', borderBottom: '1px solid #cbd5e1' }}>
                  Информация об организаторе
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ width: '220px', padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        ФИО представителя
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 600 }}>
                        ОРАЗАЛИЕВА ЖАНАР МАУТХАНОВНА
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        Должность
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                        Руководитель
                      </td>
                    </tr>

                    <tr>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#334155', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                        E-Mail
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#0284c7', fontWeight: 600 }}>
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
            <div className="fade-in">
              <div className="table-wrapper card" style={{ padding: 0, overflowX: 'auto', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>№ Лота</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Наименование лота</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Кол-во</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Цена за ед., тг.</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Сумма, тг.</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Место поставки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tender.lots && tender.lots.length > 0 ? tender.lots : [{
                      lot_number: 1,
                      title: tenderTitle,
                      quantity: 3,
                      unit_price: 1068103.45,
                      start_price: 3204310.35,
                      delivery_place: 'г. Алматы, ул. Левитана, д. 20'
                    }]).map((lot, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--pk-primary)' }}>
                          {lot.lot_number || idx + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                          {lot.title}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                          {lot.quantity} {lot.unit || 'шт'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {formatPriceKzt(lot.unit_price)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#15803d' }}>
                          {formatPriceKzt(lot.start_price)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#475569' }}>
                          {lot.delivery_place || 'г. Алматы'}
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
            <div className="fade-in card" style={{ padding: '1.25rem' }}>
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
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ ОБЪЯВЛЕНИЯ № ${tenderNumber}\n\nНаименование: ${tenderTitle}\nЗаказчик: ${organizerName}`)}`}
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
            <div className="fade-in card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a' }}>
                📜 Официальные протоколы закупки
              </h4>
              <p className="text-sec" style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                Протоколы вскрытия заявки и подведения итогов подписываются ЭЦП KalkanCrypt.
              </p>
              
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Протокол вскрытия № P-{tender.id || 1}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>Статус: Сформирован и заверен ЭЦП</div>
                </div>
                <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '0.3rem 0.6rem' }}>
                  ✓ Подписан ЭЦП
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ПРАВАЯ ЧАСТЬ: ФОРМА ПОДАЧИ ЗАЯВКИ ПОСТАВЩИКОМ (ТОЛЬКО ДЛЯ АВТОРИЗОВАННОГО ПОСТАВЩИКА) */}
        {user?.role === 'supplier' && (
          <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--pk-primary)', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'var(--pk-primary)', fontWeight: 800 }}>
              ⚡ Подача ценового предложения
            </h4>

            {myBid ? (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                <CheckCircle2 size={32} color="#15803d" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>Заявка успешно подана!</div>
                <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '0.25rem' }}>
                  Ваша цена: <strong>{formatPriceKzt(myBid.price)} ₸</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.4rem' }}>
                  Подписано ЭЦП KalkanCrypt
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitClick}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.35rem' }}>
                    Ваша цена (тенге):
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Укажите цену"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--pk-primary)' }}
                    required
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Стартовая цена: {totalSum} ₸
                  </div>
                </div>

                {/* Документы из Хранилища Поставщика */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.35rem' }}>
                    Прикрепить из Хранилища:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {vaultDocs.map((doc) => {
                      const isSelected = selectedVaultDocIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id}
                          onClick={() => toggleVaultDoc(doc)}
                          style={{ padding: '0.45rem 0.65rem', border: `1px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`, background: isSelected ? '#eff6ff' : '#ffffff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ fontWeight: 600, color: isSelected ? '#1d4ed8' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.name}
                          </span>
                          {isSelected && <Check size={14} color="#1d4ed8" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Загрузка новых файлов */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.35rem' }}>
                    Загрузить новые файлы:
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="form-control form-control-sm"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', fontWeight: 800, fontSize: '0.9rem' }}
                  disabled={isSubmitting}
                >
                  <ShieldCheck size={18} style={{ marginRight: '0.4rem' }} /> Подать заявку по ЭЦП
                </button>
              </form>
            )}
          </div>
        )}

      </div>

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
