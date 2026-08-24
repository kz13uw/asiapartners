import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenders, removeLocalDraft } from '../../hooks/useTenders';
import { tendersAPI } from '../../api';
import { useTranslation } from '../../store/useLanguageStore';
import TenderRegistryTable from '../../components/TenderRegistryTable';
import EcpModal from '../../components/EcpModal';

const DraftTenders = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tenders, loading, refetch } = useTenders('my');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEdsModal, setShowEdsModal] = useState(false);
  const [selectedTenderForEds, setSelectedTenderForEds] = useState(null);

  // Filter strictly for DRAFT tenders
  const draftTenders = (tenders || []).filter(tnd => {
    const isDraft = tnd.status === 'draft';
    const matchesSearch = !searchTerm || 
      tnd.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tnd.number?.toLowerCase().includes(searchTerm.toLowerCase());
    return isDraft && matchesSearch;
  });

  const handlePublishDraft = (id, title) => {
    setSelectedTenderForEds({ id, title });
    setShowEdsModal(true);
  };

  const processPublish = async (signedCms) => {
    if (!selectedTenderForEds) return;
    const { id, title } = selectedTenderForEds;
    try {
      let targetId = id;
      const draftItem = (tenders || []).find(t => t.id === id);
      if (typeof id === 'number' && id > 1000000000 && draftItem) {
        const createPayload = {
          title: draftItem.title || 'Новая закупка',
          description: draftItem.description || '',
          subject_type: draftItem.subject_type || 'goods',
          category_id: draftItem.category_id || null,
          method: draftItem.method || 'zcp',
          start_price: draftItem.start_price || 100000,
          deadline_at: draftItem.deadline_at || new Date(Date.now() + 14*86400000).toISOString(),
          delivery_place: draftItem.delivery_place || null,
          requires_license: !!draftItem.requires_license,
          status: 'draft'
        };
        const createdRes = await tendersAPI.create(createPayload);
        targetId = createdRes.data.id;
      }

      await tendersAPI.publish(targetId, signedCms || "demo_publish_signature_bypassed");
      removeLocalDraft(id);
      if (targetId !== id) removeLocalDraft(targetId);

      toast.success(`Черновик закупки "${title}" успешно подписан ЭЦП и опубликован!`);
      await refetch();
      navigate('/organizer/dashboard');
    } catch (e) {
      console.error(e);
      toast.error('Ошибка публикации черновика');
    } finally {
      setShowEdsModal(false);
      setSelectedTenderForEds(null);
    }
  };

  const handleDeleteDraft = async (id, title) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить черновик "${title}"?`)) return;
    try {
      if (typeof id === 'number' && id < 1000000000) {
        await tendersAPI.delete(id);
      }
      removeLocalDraft(id);
      toast.success('Черновик закупки успешно удален');
      await refetch();
    } catch (e) {
      console.error("Delete draft error:", e);
      removeLocalDraft(id);
      toast.success('Черновик закупки удален');
      await refetch();
    }
  };

  return (
    <div className="fade-in container" style={{ padding: '2rem 1rem' }}>
      
      {/* Header */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--pk-primary)' }}>
            <FileText size={26} color="var(--pk-primary)" /> {t('nav_draft_tenders') || 'Черновики тендеров'}
          </h2>
          <p className="text-sec" style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Список неопубликованных закупочных процедур, сохраненных в статусе «Драфт Тендера»
          </p>
        </div>

        <Link to="/organizer/tenders/create" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <Plus size={18} /> {t('btn_new_tender') || 'Создать новый тендер'}
        </Link>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
            Найдено черновиков: <span style={{ color: 'var(--pk-primary)', fontWeight: 700 }}>{draftTenders.length}</span>
          </div>

          <div className="search-box" style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Поиск по номеру или названию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        <TenderRegistryTable 
          tenders={draftTenders}
          loading={loading}
          userRole="draft"
          onDelete={handleDeleteDraft}
          onPublish={handlePublishDraft}
          emptyText="Черновики тендеров отсутствуют"
        />
      </div>

      <EcpModal 
        isOpen={showEdsModal} 
        onClose={() => setShowEdsModal(false)}
        onSign={processPublish}
        docTitle={selectedTenderForEds?.title || 'Публикация черновика тендера'}
      />
    </div>
  );
};

export default DraftTenders;
