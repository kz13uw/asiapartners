import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileArchive, CreditCard, Check, X, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, bidsAPI } from '../../api';
import EcpModal from '../../components/EcpModal';

const EvaluateTender = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenderRes, bidsRes] = await Promise.all([
          tendersAPI.get(id),
          bidsAPI.getByTender(id)
        ]);
        setTender(tenderRes.data);
        setBids(bidsRes.data);
      } catch (error) {
        toast.error('Ошибка загрузки данных');
        navigate('/organizer/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleBidStatus = async (bidId, newStatus) => {
    try {
      // Для демо передаем заглушку причины, если отклоняем
      const payload = { status: newStatus };
      if (newStatus === 'rejected') {
        const reason = window.prompt("Укажите причину отклонения:");
        if (!reason) return;
        payload.rejection_reason = reason;
      }
      
      await bidsAPI.updateStatus(bidId, payload);
      
      // Обновляем UI локально
      setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: newStatus, rejection_reason: payload.rejection_reason } : b));
      toast.success('Статус заявки обновлен');
    } catch (e) {
      toast.error('Ошибка изменения статуса');
    }
  };

  const handleGenerateProtocol = () => {
    const qualified = bids.filter(b => b.status === 'qualified');
    if (qualified.length === 0) {
      toast.error('Сначала допустите участников к торгам (минимум одного)');
      return;
    }
    setShowProtocolModal(true);
  };

  const signProtocol = async () => {
    setIsSigning(true);
    try {
      const edsHash = "demo_protocol_signature_999";
      await bidsAPI.generateProtocol(tender.id, edsHash);
      
      toast.success('Протокол итогов успешно подписан и опубликован!');
      navigate('/organizer/dashboard');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка подписания протокола');
    } finally {
      setIsSigning(false);
      setShowProtocolModal(false);
    }
  };

  if (loading || !tender) return <div style={{ padding: '2rem', textAlign: 'center' }}><span className="loader-spinner"></span> Загрузка...</div>;

  const qualifiedCount = bids.filter(b => b.status === 'qualified').length;
  const calculatedWinner = bids.filter(b => b.status === 'qualified').sort((a,b) => a.price - b.price)[0];

  return (
    <div className="fade-in">
      <div className="breadcrumbs" style={{ fontSize: '0.875rem', color: 'var(--pk-text-secondary)', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/organizer/dashboard'); }} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }}>Реестр активных лотов</a>
        <span>›</span>
        <span>Лот {tender.number} (Вскрытие)</span>
      </div>

      <div className="card mb-3" style={{ borderLeft: '4px solid var(--pk-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', margin: 0 }}>{tender.title}</h2>
            <div className="text-secondary" style={{ color: 'var(--pk-text-secondary)', marginTop: '0.5rem' }}>
              Номер: {tender.number} • Метод: Запрос ценовых предложений (ЗЦП) • Плановая сумма: {tender.start_price.toLocaleString('ru-RU')} ₸
            </div>
          </div>
          <span className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>Идет оценка заявок</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
        {/* Заявки участников */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            Реестр поступивших заявок <span className="badge badge-primary">{bids.length} заявок</span>
          </h3>
          
          {bids.map((bid) => (
            <div key={bid.id} style={{ border: `1px solid ${bid.status === 'qualified' ? 'var(--pk-success)' : bid.status === 'rejected' ? 'var(--pk-danger)' : 'var(--pk-border)'}`, borderRadius: '6px', marginBottom: '1rem', padding: '1.5rem', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>Контрагент ID: {bid.supplier_id}</h4>
                  <span className="text-sm text-secondary">Дата подачи: {new Date(bid.submitted_at).toLocaleString('ru-RU')}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-sm text-secondary">Ценовое предложение</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: bid.status === 'qualified' ? 'var(--pk-success)' : 'var(--pk-primary)' }}>
                    {bid.price.toLocaleString('ru-RU')} ₸
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled><FileArchive size={16} /> Квалиф_Документы.zip</button>
                <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled><CreditCard size={16} /> Подтверждение обеспечения</button>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--pk-border)', paddingTop: '1rem' }}>
                {bid.status === 'qualified' ? (
                  <span style={{ color: 'var(--pk-success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><Check size={18} /> Допущен к итогам</span>
                ) : bid.status === 'rejected' ? (
                  <span style={{ color: 'var(--pk-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}><X size={18} /> Отклонен: {bid.rejection_reason}</span>
                ) : (
                  <>
                    <button className="btn" style={{ background: 'var(--pk-success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleBidStatus(bid.id, 'qualified')}>
                      <Check size={18} /> Допустить
                    </button>
                    <button className="btn btn-outline" style={{ color: 'var(--pk-danger)', borderColor: 'var(--pk-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleBidStatus(bid.id, 'rejected')}>
                      <X size={18} /> Отклонить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {bids.length === 0 && <p className="text-sec">Заявок пока нет.</p>}
        </div>

        {/* Формирование протокола */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Публикация Итогов</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
              После оценки всех допущенных заявок, система автоматически определит победителя с наименьшей ценой.
            </p>
            
            <div style={{ background: '#fdf5d2', color: '#8a6d00', padding: '1rem', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              ℹ️ Допущено {qualifiedCount} из {bids.length} заявок
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleGenerateProtocol}>
              <FileSignature size={20} /> Сформировать Протокол
            </button>
          </div>
        </div>
      </div>

      <EcpModal 
        isOpen={showProtocolModal} 
        onClose={() => !isSigning && setShowProtocolModal(false)}
        onSign={signProtocol}
        docTitle={`Протокол итогов. Победитель: ${winner?.supplier_id || 'Не определен'}`}
      />
    </div>
  );
};

export default EvaluateTender;
