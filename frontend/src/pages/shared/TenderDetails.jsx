import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, HardDrive, FileText, CheckCircle2, Download, Upload, Trash2, Package, Wrench, AlertTriangle, Calendar, MapPin, Tag, Award, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, bidsAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [tender, setTender] = useState(null);
  const [myBid, setMyBid] = useState(null);
  const [bidPrice, setBidPrice] = useState('');
  const [supplierFiles, setSupplierFiles] = useState([]);
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTenderAndBids();
  }, [id]);

  const fetchTenderAndBids = async () => {
    try {
      const res = await tendersAPI.get(id);
      setTender(res.data);
      if (res.data.current_lowest_price) {
        setBidPrice(Math.round(res.data.current_lowest_price * 0.98));
      } else {
        setBidPrice(Math.round(res.data.start_price * 0.95));
      }

      // Если пользователь - поставщик, проверяем подавал ли он заявку
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
      toast.error('Тендер не найден');
      navigate('/tenders');
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
      toast.error(`Ваше ценовое предложение должно быть строго ниже стартовой суммы (${tender.start_price.toLocaleString('ru-RU')} ₸)`);
      return;
    }
    setShowEdsModal(true);
  };

  const processBidSubmission = async () => {
    setIsSubmitting(true);
    try {
      const edsHash = "demo_signed_hash_supplier_12345"; 
      
      const payload = {
        tender_id: tender.id,
        price: Number(bidPrice),
        eds_hash: edsHash,
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
      toast.success('Ценовое предложение и документация успешно поданы и подписаны ЭЦП!');
      fetchTenderAndBids();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Ошибка при подаче заявки');
    } finally {
      setIsSubmitting(false);
      setShowEdsModal(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount || 0);
  };

  if (!tender) return <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loader-spinner"></span> Загрузка карточки закупки...</div>;

  const isGoods = tender.subject_type === 'goods';
  const organizerName = tender.organizer_name || 'ТОО "Asia Partners"';

  return (
    <div className="fade-in container" style={{ padding: '2rem 1rem' }}>
      
      {/* Breadcrumbs */}
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tenders'); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>Реестр закупок</a>
        <span>›</span>
        <span>Карточка закупки № {tender.number}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'supplier' ? '1fr 380px' : '1fr', gap: '1.75rem' }}>
        
        {/* Левая колонка: Все сведения о закупке и лотах */}
        <div>
          {/* Главная плашка закупки */}
          <div className="card mb-3" style={{ borderLeft: '5px solid var(--pk-primary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span className="badge badge-primary" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                  {isGoods ? '📦 Товары' : '🛠️ Услуги / Работы'}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.3rem 0 0.5rem 0', lineHeight: 1.3 }}>
                  {tender.title}
                </h2>
                <div style={{ fontSize: '0.88rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <span>🏛️ Заказчик: <strong style={{ color: '#0f172a' }}>{organizerName}</strong></span>
                  <span>№ Закупки: <strong style={{ fontFamily: 'monospace', color: 'var(--pk-primary)' }}>{tender.number}</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right', background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Начальная общая сумма</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--pk-primary)' }}>
                  {formatCurrency(tender.start_price)}
                </div>
              </div>
            </div>

            {/* Сетка основных параметров */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #f1f5f9', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div>
                <div className="text-sec" style={{ fontSize: '0.75rem' }}>Способ закупки</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.15rem' }}>
                  📄 Запрос ценовых предложений (ЗЦП)
                </div>
              </div>

              <div>
                <div className="text-sec" style={{ fontSize: '0.75rem' }}>Окончание приема заявок</div>
                <div style={{ fontWeight: 600, color: '#dc2626', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={14} /> {new Date(tender.deadline_at).toLocaleString('ru-RU')}
                </div>
              </div>

              <div>
                <div className="text-sec" style={{ fontSize: '0.75rem' }}>Требование лицензии</div>
                <div style={{ fontWeight: 600, color: tender.requires_license ? '#b45309' : '#16a34a', marginTop: '0.15rem' }}>
                  {tender.requires_license ? `🔒 Да (${tender.license_category || 'Требуется лицензия'})` : '✓ Не требуется'}
                </div>
              </div>

              <div>
                <div className="text-sec" style={{ fontSize: '0.75rem' }}>Шаг понижения цены</div>
                <div style={{ fontWeight: 600, color: '#0284c7', marginTop: '0.15rem' }}>
                  {tender.step_down_pct || 1}% (от стартовой суммы)
                </div>
              </div>
            </div>
          </div>

          {/* Карточка 1: Описание закупки */}
          <div className="card mb-3" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📝 Описание и технические особенности закупки
            </h3>
            <p style={{ color: '#334155', lineHeight: 1.6, fontSize: '0.92rem', whiteSpace: 'pre-wrap', margin: 0 }}>
              {tender.description || 'Подробное описание предмета закупки указано в прилагаемой технической спецификации.'}
            </p>
          </div>

          {/* Карточка 2: ПОЛНАЯ ТАБЛИЦА ЛОТОВ И СПЕЦИФИКАЦИЙ */}
          <div className="card mb-3" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="var(--pk-primary)" /> Реестр лотов и спецификация ({tender.lots?.length || 1})
              </h3>
              <span className="badge badge-outline" style={{ fontSize: '0.78rem' }}>
                {isGoods ? 'Спецификация товаров' : 'График выполнения работ'}
              </span>
            </div>

            {tender.lots && tender.lots.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {tender.lots.map((lot, idx) => (
                  <div key={lot.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    
                    {/* Заголовок лота */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div>
                        <span style={{ fontWeight: 800, color: 'var(--pk-primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                          Лот №{lot.lot_number || idx + 1}
                        </span>
                        <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                          {lot.title}
                        </h4>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Плановая сумма лота</div>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#15803d' }}>
                          {formatCurrency(lot.start_price)}
                        </div>
                      </div>
                    </div>

                    {lot.description && (
                      <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.85rem', background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '6px' }}>
                        {lot.description}
                      </p>
                    )}

                    {/* Позиции спецификации лота */}
                    <div className="table-wrapper" style={{ overflowX: 'auto', marginBottom: '0.85rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Количество</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Ед. изм.</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Цена за ед.</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Режим НДС</th>
                            <th style={{ padding: '0.5rem 0.75rem' }}>Сумма НДС</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Итого плановая</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{lot.quantity}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>{lot.unit || 'шт'}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>{formatCurrency(lot.unit_price)}</td>
                            <td style={{ padding: '0.6rem 0.75rem' }}>
                              {lot.vat_mode === 'no_vat' ? 'Без НДС (0%)' : `Включая НДС (${lot.vat_rate || 16}%)`}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', color: '#0284c7' }}>{formatCurrency(lot.vat_amount)}</td>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              {formatCurrency(lot.start_price)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Специфические условия лота (Товары или Услуги) */}
                    <div style={{ background: isGoods ? '#f0f9ff' : '#fdf4ff', borderRadius: '8px', padding: '0.75rem 1rem', border: `1px solid ${isGoods ? '#bae6fd' : '#f5d0fe'}`, fontSize: '0.82rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                      {isGoods ? (
                        <>
                          <div>
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>Базис поставки:</span> <strong>{lot.incoterms || 'DDP'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#0369a1', fontWeight: 600 }}>Авансирование:</span> <strong>{lot.advance_payment_pct || 0}%</strong>
                          </div>
                          {lot.delivery_place && (
                            <div>
                              <span style={{ color: '#0369a1', fontWeight: 600 }}>Место выгрузки:</span> <strong>{lot.delivery_place}</strong>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {lot.service_start_date && (
                            <div>
                              <span style={{ color: '#701a75', fontWeight: 600 }}>Начало работ:</span> <strong>{new Date(lot.service_start_date).toLocaleDateString('ru-RU')}</strong>
                            </div>
                          )}
                          {lot.service_end_date && (
                            <div>
                              <span style={{ color: '#701a75', fontWeight: 600 }}>Завершение:</span> <strong>{new Date(lot.service_end_date).toLocaleDateString('ru-RU')}</strong>
                            </div>
                          )}
                          <div>
                            <span style={{ color: '#701a75', fontWeight: 600 }}>Гарантия:</span> <strong>{lot.warranty_months || 12} мес.</strong>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.88rem', color: '#64748b', fontStyle: 'italic' }}>
                Спецификация указана в прилагаемых файлах документации.
              </div>
            )}
          </div>

          {/* Карточка 3: Квалификационные требования */}
          {tender.qual_requirements && tender.qual_requirements.length > 0 && (
            <div className="card mb-3" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="var(--pk-primary)" /> Квалификационные требования к Поставщику ({tender.qual_requirements.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {tender.qual_requirements.map((req, idx) => (
                  <div key={req.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--pk-primary)' }}>{idx + 1}.</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{req.title}</span>
                    </div>
                    {req.is_mandatory ? (
                      <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>🔒 Обязательно</span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem' }}>Опционально</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Карточка 4: Документация и Приложения Заказчика */}
          <div className="card mb-3" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📁 Прилагаемые документы и проект договора
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {/* Файлы Заказчика из БД */}
              {tender.documents && tender.documents.length > 0 ? (
                tender.documents.map((doc, i) => (
                  <a
                    key={doc.id || i}
                    href={doc.file_path || '#'}
                    download={doc.file_name}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px' }}
                  >
                    <FileText size={22} color="#0284c7" />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.file_name}
                      </div>
                      <div className="text-sm text-sec" style={{ fontSize: '0.75rem' }}>
                        {doc.doc_type || 'Документ закупки'} • {Math.round((doc.file_size || 1024) / 1024)} KB
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                /* Стандартный пакет документов при отсутствии прикрепленных файлов */
                <>
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ПРОЕКТ ДОГОВОРА ПО ЗАКУПКЕ № ${tender.number}\n\n1. Предмет договора: ${tender.title}\n2. Заказчик: ${organizerName}\n3. Штрафные санкции: 0.1% за каждый день просрочки\n4. Оплата: по факту выполнения работ / передачи товара.`)}`}
                    download={`Проект_Договора_${tender.number}.txt`}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px' }}
                  >
                    <FileText size= {22} color="#0284c7" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>📑 Проект договора.pdf</div>
                      <div className="text-sm text-sec" style={{ fontSize: '0.75rem' }}>Условия и проект контракта</div>
                    </div>
                  </a>

                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(`ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ ЛОТОВ № ${tender.number}\n\nНаименование: ${tender.title}\n\nЛоты:\n${tender.lots?.map((l, i) => `${i+1}. ${l.title} (Кол-во: ${l.quantity} ${l.unit})`).join('\n') || 'Спецификация лота'}`)}`}
                    download={`Техническая_Спецификация_${tender.number}.txt`}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', textDecoration: 'none', borderColor: '#cbd5e1', color: '#1e293b', borderRadius: '10px' }}
                  >
                    <FileText size={22} color="#16a34a" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>🛠️ Техническое задание.pdf</div>
                      <div className="text-sm text-sec" style={{ fontSize: '0.75rem' }}>Параметры и ГОСТ</div>
                    </div>
                  </a>
                </>
              )}
            </div>

            {/* Опубликованный Протокол Итогов если завершено */}
            {(tender.status === 'completed' || tender.status === 'COMPLETED') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', marginTop: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏛️ Официальный Протокол Итогов Опубликован
                </div>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(`🏛️ ОФИЦИАЛЬНЫЙ ПРОТОКОЛ ИТОГОВ ЗАКУПКИ № ${tender.number}\nДата публикации: ${new Date().toLocaleString('ru-RU')}\n\n1 МЕСТО (ПОБЕДИТЕЛЬ): Подтверждено\nШтамп ЭЦП: NCALayer SHA256: 8f9b2c...`)}`}
                  download={`Протокол_Итогов_${tender.number}.pdf`}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', backgroundColor: '#15803d', borderColor: '#15803d', marginTop: '0.5rem' }}
                >
                  <Download size={14} /> Скачать Протокол Итогов (PDF + ЭЦП)
                </a>
              </div>
            )}
          </div>

        </div>

        {/* Правая колонка: ПОДАЧА ЗАЯВКИ ПОСТАВЩИКОМ */}
        {user?.role === 'supplier' && (
          <div>
            <div className="card" style={{ position: 'sticky', top: '1.5rem', padding: '1.5rem', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              
              {myBid ? (
                /* Если заявка уже была подана поставщиком */
                <div>
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ background: '#dcfce7', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                      <CheckCircle2 size={32} color="#16a34a" />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 0.35rem 0', fontWeight: 800 }}>
                      Ваша заявка подана!
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                      Ценовое предложение: <strong style={{ color: 'var(--pk-primary)', fontSize: '1.05rem' }}>{formatCurrency(myBid.price)}</strong>
                    </p>
                    {myBid.rank && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <span className="badge" style={{ backgroundColor: myBid.rank === 1 ? '#dcfce7' : '#fef3c7', color: myBid.rank === 1 ? '#15803d' : '#b45309', fontWeight: 700, padding: '0.3rem 0.6rem' }}>
                          🏆 Текущий ранг: {myBid.rank} место
                        </span>
                      </div>
                    )}
                  </div>

                  {myBid.documents && myBid.documents.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>Прикрепленные документы:</div>
                      {myBid.documents.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b' }}>
                          <FileText size={14} color="var(--pk-primary)" /> {d.file_name}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                    <Link to="/supplier/dashboard" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      Перейти в мои заявки
                    </Link>
                  </div>
                </div>
              ) : (
                /* Форма подачи ценового предложения и загрузки документов */
                <form onSubmit={handleSubmitClick}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 color="var(--pk-success)" size={22} /> Подача ценового предложения
                  </h3>

                  {/* Поле 1: Ценовое предложение */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
                      1. Ваше ценовое предложение (₸) <span style={{ color: 'var(--pk-danger)' }}>*</span>
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={bidPrice}
                      onChange={(e) => setBidPrice(e.target.value)}
                      placeholder="Например: 1200000" 
                      style={{ fontSize: '1.25rem', padding: '0.65rem 0.85rem', fontWeight: 800, color: 'var(--pk-primary)' }}
                      required
                    />
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                      Стартовая цена: {formatCurrency(tender.start_price)}
                    </div>
                  </div>

                  {/* Поле 2: ПОДГРУЗКА ФАЙЛОВ ПОСТАВЩИКА */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
                      2. Документация заявки (Файлы) <span style={{ color: 'var(--pk-danger)' }}>*</span>
                    </label>

                    <label style={{
                      border: '2px dashed var(--pk-primary)',
                      borderRadius: '10px',
                      padding: '1rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                      background: 'rgba(43,138,196,0.03)',
                      transition: 'all 0.2s'
                    }}>
                      <Upload size={24} color="var(--pk-primary)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pk-primary)', textAlign: 'center' }}>
                        Загрузить коммерческое предложение и квалификационные формы
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        PDF, DOCX, XLSX, ZIP (до 50 МБ)
                      </span>
                      <input 
                        type="file" 
                        multiple 
                        onChange={handleFileUpload} 
                        style={{ display: 'none' }} 
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                      />
                    </label>

                    {/* Список загруженных файлов поставщика */}
                    {supplierFiles.length > 0 && (
                      <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {supplierFiles.map(file => (
                          <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                              <FileText size={15} color="var(--pk-primary)" />
                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                {file.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                              title="Удалить файл"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Галочка согласия */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                      <input type="checkbox" required style={{ marginTop: '0.2rem' }} />
                      <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                        Подтверждаю достоверность сведений и соглашаюсь с условиями закупки и проекта договора.
                      </span>
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '0.95rem', borderRadius: '10px' }}
                  >
                    🚀 Подписать ЭЦП и Отправить
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

      </div>

      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => !isSubmitting && setShowEdsModal(false)}
        onSign={processBidSubmission}
        docTitle={`Подача заявки по закупке № ${tender.number} на сумму ${formatCurrency(Number(bidPrice))}`}
      />
    </div>
  );
};

export default TenderDetails;

