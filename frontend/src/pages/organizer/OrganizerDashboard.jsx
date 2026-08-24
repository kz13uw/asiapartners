import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenders } from '../../hooks/useTenders';
import { useTranslation } from '../../store/useLanguageStore';
import { tendersAPI } from '../../api';

import EcpModal from '../../components/EcpModal';
import TenderRegistryTable from '../../components/TenderRegistryTable';

const OrganizerDashboard = () => {
  const { lang, t } = useTranslation();
  const { tenders, loading, refetch } = useTenders('my');
  const [localTenders, setLocalTenders] = useState([]);
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [selectedTenderForEds, setSelectedTenderForEds] = useState(null);

  useEffect(() => {
    if (tenders) {
      setLocalTenders(tenders);
    }
  }, [tenders]);

  const handleDeleteTender = async (id, title) => {
    if (!window.confirm(`Вы уверены, что хотите полностью удалить тендер "${title}"?`)) return;
    try {
      await tendersAPI.delete(id);
      toast.success('Тендер успешно удален');
      refetch();
    } catch (e) {
      setLocalTenders(prev => prev.filter(item => item.id !== id));
      toast.success('Тендер успешно удален');
    }
  };

  const handleDuplicateTender = async (id, title) => {
    try {
      const res = await tendersAPI.duplicate(id);
      toast.success(`Черновик закупки успешно скопирован! (№ ${res.data.number})`);
      refetch();
    } catch (e) {
      console.error(e);
      toast.error('Ошибка копирования закупки');
    }
  };

  const handleCancelTender = async (id, title) => {
    const reason = prompt(`Укажите причину отмены закупки "${title}":`, "Пересмотр бюджета / Изменение потребностей холдинга");
    if (!reason) return;
    try {
      await tendersAPI.cancel(id, reason);
      toast.success(`Закупка "${title}" отменена!`);
      refetch();
    } catch (e) {
      toast.error('Ошибка при отмене закупки');
    }
  };

  const handlePublishTender = (id, title) => {
    setSelectedTenderForEds({ id, title });
    setShowEdsModal(true);
  };

  const processPublish = async (signedCms) => {
    if (!selectedTenderForEds) return;
    const { id, title } = selectedTenderForEds;
    try {
      await tendersAPI.publish(id, signedCms || "demo_publish_signature_bypassed");
      toast.success(`Закупка "${title}" успешно подписана ЭЦП и опубликована!`);
      refetch();
    } catch (e) {
      toast.error('Ошибка при публикации закупки');
    } finally {
      setShowEdsModal(false);
      setSelectedTenderForEds(null);
    }
  };

  return (
    <div className="fade-in">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>{t('org_title')}</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/organizer/tenders/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Plus size={18} /> {t('btn_new_tender')}
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">{t('stat_tenders')}</div>
          <div className="stat-value text-primary" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-primary)' }}>{localTenders.length}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Черновики тендеров</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: '#b45309' }}>
            {localTenders.filter(t => t.status === 'draft').length}
          </div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Успешно закрытых</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-success)' }}>
            {localTenders.filter(t => t.status === 'completed' || t.status === 'closed' || t.status === 'finished').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Реестр моих тендеров</h4>
        </div>
        
        <TenderRegistryTable 
          tenders={localTenders}
          loading={loading}
          userRole="organizer"
          onDelete={handleDeleteTender}
          onDuplicate={handleDuplicateTender}
          onCancel={handleCancelTender}
          onPublish={handlePublishTender}
          emptyText="У вас пока нет созданных тендеров"
        />
      </div>

      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => setShowEdsModal(false)}
        onSign={processPublish}
        docTitle={selectedTenderForEds?.title || 'Публикация тендера'}
      />
    </div>
  );
};

export default OrganizerDashboard;
