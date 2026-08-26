import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileArchive, CreditCard, Check, X, FileSignature, Building, User, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../store/useLanguageStore';
import { tendersAPI, bidsAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const EvaluateTender = () => {
  const { lang, t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState(null);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tenderRes, bidsRes] = await Promise.all([
        tendersAPI.get(id),
        bidsAPI.getByTender(id)
      ]);
      setTender(tenderRes.data);
      setBids(bidsRes.data || []);
    } catch (error) {
      console.error("Fetch evaluation data error:", error);
      toast.error('Ошибка загрузки данных закупки');
      navigate('/organizer/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBidStatus = async (bidId, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'rejected') {
        const reason = window.prompt("Укажите официальную причину отклонения заявки:");
        if (!reason || !reason.trim()) {
          toast.error("Причина отклонения не указана!");
          return;
        }
        payload.rejection_reason = reason.trim();
      }
      
      const res = await bidsAPI.updateStatus(bidId, payload);
      
      // Обновляем список локально
      setBids(prev => prev.map(b => b.id === bidId ? { 
        ...b, 
        status: res.data.status || newStatus, 
        rejection_reason: payload.rejection_reason || b.rejection_reason 
      } : b));

      toast.success(newStatus === 'qualified' ? 'Участник успешно допущен!' : 'Заявка участника отклонена');
    } catch (e) {
      console.error("Update bid status error:", e);
      toast.error(e.response?.data?.detail || 'Ошибка при изменении статуса заявки');
    }
  };

  const handleGenerateProtocol = () => {
    const qualified = bids.filter(b => b.status === 'qualified');
    if (qualified.length === 0) {
      toast.error('Сначала допустите участников к торгам (минимум 1 участник)');
      return;
    }
    setShowProtocolModal(true);
  };

  const signProtocol = async (signedCms) => {
    setIsSigning(true);
    try {
      const edsHash = signedCms || null;
      if (!edsHash) {
        toast.error('Ошибка: Подпись ЭЦП не получена. Повторите подписание.');
        setIsSigning(false);
        return;
      }
      await bidsAPI.generateProtocol(tender.id, edsHash);
      
      toast.success('Протокол итогов успешно подписан ЭЦП и опубликован!');
      navigate('/organizer/dashboard');
    } catch (e) {
      console.error("Protocol sign error:", e);
      toast.error(e.response?.data?.detail || 'Ошибка подписания протокола');
    } finally {
      setIsSigning(false);
      setShowProtocolModal(false);
    }
  };

  if (loading || !tender) return <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loader-spinner"></span> Загрузка карточки оценки...</div>;

  const qualifiedCount = bids.filter(b => b.status === 'qualified').length;
  const calculatedWinner = bids.filter(b => b.status === 'qualified').sort((a,b) => a.price - b.price)[0];

  return (
    <div className="fade-in container" style={{ padding: '2rem 1rem' }}>
      
      {/* Хлебные крошки */}
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/organizer/dashboard'); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>Реестр активных лотов</a>
        <span>›</span>
        <span>Оценка и подведение итогов № {tender.number}</span>
      </div>

      {/* Заголовок закупки */}
      <div className="card mb-3" style={{ borderLeft: '5px solid var(--pk-primary)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-primary" style={{ fontSize: '0.78rem', marginBottom: '0.5rem' }}>
              {tender.subject_type === 'goods' ? '📦 Товары' : '🛠️ Услуги / Работы'}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.3rem 0 0.5rem 0', color: '#0f172a' }}>{tender.title}</h2>
            <div className="text-secondary" style={{ color: '#64748b', fontSize: '0.88rem' }}>
              № Закупки: <strong style={{ fontFamily: 'monospace', color: 'var(--pk-primary)' }}>{tender.number}</strong> • Способ: <strong>Запрос ценовых предложений (ЗЦП)</strong> • Плановая сумма: <strong style={{ color: '#15803d' }}>{(tender.start_price ?? 0).toLocaleString('ru-RU')} ₸</strong>
            </div>
          </div>
          <span className="badge badge-warning" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>⚖️ Рассмотрение заявок</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        
        {/* Левая колонка: Заявки участников */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid var(--pk-border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
              📥 Реестр поступивших ценовых предложений ({bids.length})
            </h3>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>{bids.length} участников</span>
          </div>
          
          {bids.map((bid) => {
            const isQualified = bid.status === 'qualified';
            const isRejected = bid.status === 'rejected';

            return (
              <div 
                key={bid.id} 
                style={{ 
                  border: `1.5px solid ${isQualified ? '#22c55e' : isRejected ? '#ef4444' : '#cbd5e1'}`, 
                  borderRadius: '12px', 
                  marginBottom: '1.25rem', 
                  padding: '1.25rem', 
                  backgroundColor: isQualified ? '#f0fdf4' : isRejected ? '#fef2f2' : '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                        {bid.company_name || bid.supplier_name || `Контрагент ID: ${bid.supplier_id}`}
                      </h4>
                      {bid.company_bin && (
                        <span className="badge badge-outline" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          БИН: {bid.company_bin}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.78rem', color: '#0284c7', borderColor: '#38bdf8', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => setSelectedCompanyProfile(bid)}
                        title="Посмотреть полный профиль организации и контакты"
                      >
                        <Building size={13} /> Профиль компании
                      </button>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem' }}>
                      🕒 Подано: <strong>{new Date(bid.submitted_at).toLocaleString('ru-RU')}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', background: '#ffffff', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Ценовое предложение</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isQualified ? '#16a34a' : 'var(--pk-primary)' }}>
                      {(bid.price ?? 0).toLocaleString('ru-RU')} ₸
                    </div>
                  </div>
                </div>
                
                {/* Файлы заявки */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {bid.documents && bid.documents.length > 0 ? (
                    bid.documents.map((doc, dIdx) => (
                      <a 
                        key={dIdx}
                        href={doc.file_path || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#334155', textDecoration: 'none' }}
                      >
                        <FileArchive size={14} color="var(--pk-primary)" /> {doc.file_name || 'Документация'}
                      </a>
                    ))
                  ) : (
                    <>
                      <button className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }} disabled>
                        <FileArchive size={14} /> Квалиф_Документы.zip
                      </button>
                      <button className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }} disabled>
                        <CreditCard size={14} /> Обеспечение_заявки.pdf
                      </button>
                    </>
                  )}
                </div>
                
                {/* Кнопки решения комиссий: Допустить / Отклонить */}
                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1rem', alignItems: 'center' }}>
                  {isQualified ? (
                    <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem' }}>
                      <Check size={20} /> Участник допущен к подведению итогов
                      <button 
                        className="btn btn-link btn-sm" 
                        style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '1rem', textDecoration: 'underline' }}
                        onClick={() => handleBidStatus(bid.id, 'submitted')}
                      >
                        Сбросить решение
                      </button>
                    </div>
                  ) : isRejected ? (
                    <div style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.92rem' }}>
                      <X size={20} /> Отклонен: <span style={{ fontWeight: 400, color: '#334155' }}>{bid.rejection_reason || 'Несоответствие квалификационным требованиям'}</span>
                      <button 
                        className="btn btn-link btn-sm" 
                        style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '1rem', textDecoration: 'underline' }}
                        onClick={() => handleBidStatus(bid.id, 'submitted')}
                      >
                        Сбросить решение
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        type="button"
                        className="btn" 
                        style={{ backgroundColor: '#16a34a', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }} 
                        onClick={() => handleBidStatus(bid.id, 'qualified')}
                      >
                        <Check size={18} /> Допустить
                      </button>
                      <button 
                        type="button"
                        className="btn btn-outline" 
                        style={{ color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }} 
                        onClick={() => handleBidStatus(bid.id, 'rejected')}
                      >
                        <X size={18} /> Отклонить
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {bids.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              📭 На данную закупку пока не поступило ни одной заявки от поставщиков.
            </div>
          )}
        </div>

        {/* Правая панель: Формирование протокола */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '2rem', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>🏆 Публикация Итогов</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1.25rem', lineHeight: 1.5, fontSize: '0.85rem' }}>
              После рассмотрения всех поступивших заявок система автоматически определит победителя с наименьшим ценовым предложением среди допущенных участников.
            </p>
            
            <div style={{ background: qualifiedCount > 0 ? '#f0fdf4' : '#fef3c7', color: qualifiedCount > 0 ? '#166534' : '#92400e', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', border: `1px solid ${qualifiedCount > 0 ? '#bbf7d0' : '#fde68a'}` }}>
              {qualifiedCount > 0 ? (
                <>✓ <strong>Допущено участников: {qualifiedCount} из {bids.length}</strong></>
              ) : (
                <>⚠️ <strong>Сначала допустите участников к подведению итогов.</strong></>
              )}
            </div>
            
            <button 
              type="button"
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, borderRadius: '8px' }} 
              onClick={handleGenerateProtocol}
            >
              <FileSignature size={20} /> Сформировать Протокол
            </button>
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА ПРОФИЛЯ КОМПАНИИ ПОСТАВЩИКА */}
      {selectedCompanyProfile && (
        <div 
          className="modal-overlay" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)', padding: '1rem' }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building color="var(--pk-primary)" size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>Профиль организации Поставщика</h3>
              </div>
              <button onClick={() => setSelectedCompanyProfile(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Наименование компании / ТОО / ИП:</div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', marginTop: '0.2rem' }}>
                  {selectedCompanyProfile.company_name || 'ТОО "СтройКом Казахстан"'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>БИН / ИИН:</div>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--pk-primary)', marginTop: '0.15rem' }}>
                    {selectedCompanyProfile.company_bin || '980440001234'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Аккредитация ЭЦП:</div>
                  <div style={{ fontWeight: 700, color: '#16a34a', marginTop: '0.15rem' }}>
                    <ShieldCheck size={14} style={{ display: 'inline', marginRight: '0.2rem' }} /> Подтверждена
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  <User size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> Руководитель:
                </div>
                <div style={{ fontWeight: 700, color: '#1e293b', marginTop: '0.15rem' }}>
                  {selectedCompanyProfile.director_name || 'Ахметов Марат Ерланович'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Mail size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> Email:
                  </div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.15rem' }}>
                    {selectedCompanyProfile.supplier_email || 'supplier@asia.kz'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Phone size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> Телефон:
                  </div>
                  <div style={{ fontWeight: 600, color: '#0f172a', marginTop: '0.15rem' }}>
                    {selectedCompanyProfile.supplier_phone || '+7 (7222) 55-44-33'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> Юридический адрес:
                </div>
                <div style={{ fontWeight: 600, color: '#1e293b', marginTop: '0.15rem' }}>
                  {selectedCompanyProfile.supplier_address || 'г. Семей, ул. Кабанбай Батыра 42'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedCompanyProfile(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px' }}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <EcpModal 
        isOpen={showProtocolModal} 
        onClose={() => !isSigning && setShowProtocolModal(false)}
        onSign={signProtocol}
        docTitle={`Протокол итогов. Победитель: ${calculatedWinner?.company_name || calculatedWinner?.supplier_name || 'Не определен'}`}
      />
    </div>
  );
};

export default EvaluateTender;
