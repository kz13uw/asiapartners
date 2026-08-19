import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ShieldCheck, TrendingDown, ArrowLeft, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import EcpModal from '../../components/EcpModal';

const AuctionRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tender, setTender] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customPrice, setCustomPrice] = useState('');
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [selectedBidPrice, setSelectedBidPrice] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  const fetchAuctionData = async () => {
    try {
      const res = await axios.get(`/api/v1/tenders/${id}`);
      setTender(res.data);

      try {
        const bidsRes = await axios.get(`/api/v1/bids/tender/${id}`);
        setBids(bidsRes.data);
      } catch (e) {
        // Fallback mock bids for display
        setBids([
          { id: 1, rank: 1, price: res.data.current_lowest_price || res.data.start_price * 0.95, company_id: 10, submitted_at: new Date().toISOString() },
          { id: 2, rank: 2, price: res.data.start_price * 0.98, company_id: 11, submitted_at: new Date(Date.now() - 300000).toISOString() }
        ]);
      }
    } catch (e) {
      toast.error('Ошибка загрузки торгов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 5000); // авто-обновление каждые 5 сек
    return () => clearInterval(interval);
  }, [id]);

  // Таймер обратного отсчета
  useEffect(() => {
    if (!tender?.deadline_at) return;

    const timer = setInterval(() => {
      const diff = new Date(tender.deadline_at) - new Date();
      if (diff <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0 });
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ minutes: mins, seconds: secs });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tender?.deadline_at]);

  const minStep = tender ? (tender.min_step_amount || (tender.start_price * (tender.step_down_pct || 1) / 100)) : 0;
  const currentBest = tender?.current_lowest_price || tender?.start_price || 0;
  const recommendedBid = Math.max(0, currentBest - minStep);

  const handleOpenSignModal = (price) => {
    if (price >= currentBest) {
      toast.error(`Ваша ставка должна быть строго ниже текущей минимальной (${currentBest.toLocaleString()} ₸)`);
      return;
    }
    setSelectedBidPrice(price);
    setShowEdsModal(true);
  };

  const handleEdsSuccess = async (cmsBase64) => {
    setShowEdsModal(false);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post('/api/v1/bids', {
        tender_id: parseInt(id),
        price: selectedBidPrice,
        eds_hash: cmsBase64 || 'mock_eds_hash_bnect'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Ставка ${selectedBidPrice.toLocaleString()} ₸ принята и подписана ЭЦП!`);
      fetchAuctionData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Ошибка подачи ставки');
    }
  };

  if (loading || !tender) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="loader-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--pk-text-secondary)' }}>Загрузка аукционного зала...</p>
      </div>
    );
  }

  return (
    <div className="fade-in container" style={{ padding: '1.5rem 1rem' }}>
      
      {/* Back button */}
      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/tenders/${id}`)} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ArrowLeft size={16} /> Назад к тендеру
      </button>

      {/* Header Banner */}
      <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge" style={{ backgroundColor: '#22c55e', color: '#fff', fontWeight: 600, padding: '0.35rem 0.75rem', marginBottom: '0.75rem', display: 'inline-block' }}>
              🔴 Живые торги (Аукцион на понижение)
            </span>
            <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>{tender.number}: {tender.title}</h1>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Заказчик: ТОО "Asia Partners"</div>
          </div>

          {/* Countdown & Anti-sniping */}
          <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.1)', padding: '1rem 1.5rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
              <Clock size={16} color="#fbbf24" /> Осталось времени
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#fef08a' }}>
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              ⚡ Включена защита Anti-Sniping (+{tender.auto_extend_minutes || 5} мин при ставке)
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Bidding Controls */}
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingDown color="var(--pk-primary)" size={20} /> Панель подачи ставки
            </h3>

            <div style={{ backgroundColor: 'var(--pk-bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--pk-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-sec" style={{ fontSize: '0.85rem' }}>Стартовая цена:</span>
                <strong style={{ textDecoration: 'line-through', color: 'var(--pk-text-secondary)' }}>{tender.start_price?.toLocaleString()} ₸</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--pk-text-main)' }}>Текущая лидирующая цена:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534' }}>{currentBest.toLocaleString()} ₸</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--pk-text-secondary)', marginTop: '0.5rem', borderTop: '1px dashed var(--pk-border)', paddingTop: '0.5rem' }}>
                Минимальный шаг понижения: <strong>-{minStep.toLocaleString()} ₸ ({tender.step_down_pct || 1}%)</strong>
              </div>
            </div>

            {user?.role === 'supplier' ? (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  Быстрый выбор ценового шага:
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleOpenSignModal(recommendedBid)}
                    style={{ padding: '0.85rem', flexDirection: 'column', height: 'auto', textAlign: 'center' }}
                  >
                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Рекомендуемая ставка (-1 шаг)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{recommendedBid.toLocaleString()} ₸</strong>
                  </button>

                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleOpenSignModal(Math.max(0, currentBest - minStep * 2))}
                    style={{ padding: '0.85rem', flexDirection: 'column', height: 'auto', textAlign: 'center' }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--pk-text-secondary)' }}>Шаг ×2 (-2%)</span>
                    <strong style={{ fontSize: '1.1rem' }}>{Math.max(0, currentBest - minStep * 2).toLocaleString()} ₸</strong>
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--pk-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem' }}>
                    Или введите свою стоимость в ₸:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number" 
                      className="form-control" 
                      placeholder={`Меньше чем ${currentBest.toLocaleString()}`}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleOpenSignModal(parseFloat(customPrice))}
                      disabled={!customPrice || parseFloat(customPrice) >= currentBest}
                    >
                      Подать
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: 'var(--pk-text-secondary)' }}>
                Вы зашли как <strong>{user?.role}</strong>. Наблюдение за торгами доступно в режиме чтения.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Leaderboard */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award color="var(--pk-accent)" size={20} /> Таблица лидеров торгов
            </h3>

            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left', backgroundColor: 'var(--pk-bg-main)' }}>
                    <th style={{ padding: '0.75rem' }}>Ранг</th>
                    <th style={{ padding: '0.75rem' }}>Участник</th>
                    <th style={{ padding: '0.75rem' }}>Предложенная цена</th>
                    <th style={{ padding: '0.75rem' }}>Время</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--pk-text-secondary)' }}>
                        Пока нет поданых ставок. Будьте первыми!
                      </td>
                    </tr>
                  ) : (
                    bids.map((b, idx) => (
                      <tr key={b.id || idx} style={{ borderBottom: '1px solid var(--pk-border)', backgroundColor: idx === 0 ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700 }}>
                          {idx === 0 ? (
                            <span className="badge" style={{ backgroundColor: '#166534', color: '#fff' }}>🥇 1 место</span>
                          ) : idx === 1 ? (
                            <span className="badge" style={{ backgroundColor: '#854d0e', color: '#fff' }}>🥈 2 место</span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                          ТОО «Поставщик #{b.company_id || b.supplier_id || idx + 1}»
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: idx === 0 ? '#15803d' : 'var(--pk-text-main)' }}>
                          {b.price?.toLocaleString()} ₸
                          {b.is_anti_dumping_flag && (
                            <span className="badge badge-warning" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>⚠️ Демпинг</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--pk-text-secondary)', fontSize: '0.8rem' }}>
                          {new Date(b.submitted_at || Date.now()).toLocaleTimeString('ru-RU')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* EDS Modal */}
      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => setShowEdsModal(false)}
        onSign={handleEdsSuccess}
        docTitle={`Подача ценового предложения ${selectedBidPrice?.toLocaleString()} ₸ в аукционе #${id}`}
      />
    </div>
  );
};

export default AuctionRoom;
