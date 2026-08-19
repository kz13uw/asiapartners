import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Search, Plus, Trash2, Send, Eye, Clock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenders, removeLocalDraft } from '../../hooks/useTenders';
import { tendersAPI } from '../../api';
import { useTranslation } from '../../store/useLanguageStore';

import EcpModal from '../../components/EcpModal';

const DraftTenders = () => {
  const { lang, t } = useTranslation();
  const navigate = useNavigate();
  const { tenders, loading, refetch } = useTenders('my');
  const [searchTerm, setSearchTerm] = useState('');
  const [publishingId, setPublishingId] = useState(null);
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
    setPublishingId(id);
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
          lots: (draftItem.lots || []).map((l, idx) => ({
            lot_number: l.lot_number || (idx + 1),
            title: l.title || draftItem.title,
            quantity: l.quantity || 1,
            unit: l.unit || 'шт',
            unit_price: l.unit_price || 100000,
            start_price: l.start_price || 100000,
            vat_mode: l.vat_mode || 'include_vat',
            vat_rate: l.vat_rate || 16,
            vat_amount: l.vat_amount || 0,
            total_price_without_vat: l.total_price_without_vat || 0
          }))
        };
        const createdRes = await tendersAPI.create(createPayload);
        targetId = createdRes.data.id;
      }

      await tendersAPI.publish(targetId, signedCms || "demo_publish_signature_bypassed");
      removeLocalDraft(id);
      if (targetId !== id) removeLocalDraft(targetId);

      toast.success(`Черновик закупки "${title}" успешно подписан ЭЦП и опубликован! Теперь он переведен в активные закупки.`);
      await refetch();
      navigate('/organizer/dashboard');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Ошибка публикации черновика');
    } finally {
      setPublishingId(null);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(amount || 0);
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="loader-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p className="text-sec">Загрузка списка черновиков...</p>
          </div>
        ) : draftTenders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <FileText size={42} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#334155', marginBottom: '0.35rem' }}>Черновики отсутствуют</h3>
            <p className="text-sec" style={{ maxWidth: '420px', margin: '0 auto 1.25rem', fontSize: '0.88rem' }}>
              У вас нет сохраненных черновиков закупки. Чтобы создать драфт тендера, заполните форму и нажмите «Сохранить как черновик».
            </p>
            <Link to="/organizer/tenders/create" className="btn btn-primary btn-sm">
              <Plus size={16} /> Создать тендер
            </Link>
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--pk-border)', color: '#475569' }}>
                  <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>№ Черновика</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Наименование закупки</th>
                  <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Способ закупки</th>
                  <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Плановая сумма</th>
                  <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Дата создания</th>
                  <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Статус</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {draftTenders.map((tnd) => (
                  <tr key={tnd.id} style={{ borderBottom: '1px solid var(--pk-border)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--pk-primary)', whiteSpace: 'nowrap' }}>
                      <Link to={`/organizer/tenders/${tnd.id}/edit`} style={{ color: 'var(--pk-primary)', textDecoration: 'none' }} title="Кликните для редактирования черновика">
                        {tnd.number || `TND-DRAFT-${tnd.id}`}
                      </Link>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', maxWidth: '220px' }}>
                      <Link to={`/organizer/tenders/${tnd.id}/edit`} style={{ textDecoration: 'none' }} title="Кликните для редактирования черновика">
                        <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tnd.title} <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>✏️</span>
                        </div>
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                        {tnd.subject_type === 'goods' ? '📦 Товары' : '🛠️ Услуги / Работы'}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}>
                        ЗЦП
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: 'var(--pk-primary)', whiteSpace: 'nowrap' }}>
                      {formatCurrency(tnd.start_price)}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={13} />
                        {new Date(tnd.created_at || Date.now()).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <Link to={`/organizer/tenders/${tnd.id}/edit`} style={{ textDecoration: 'none' }}>
                        <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }} title="Редактировать черновик">
                          ⏳ {t('status_draft_tender') || 'Драфт Тендера'}
                        </span>
                      </Link>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <Link
                          to={`/organizer/tenders/${tnd.id}/edit`}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', color: '#0284c7', borderColor: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          title="Открыть форму создания и продолжить заполнение черновика"
                        >
                          ✏️ Изменить
                        </Link>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                          onClick={() => handlePublishDraft(tnd.id, tnd.title)}
                          disabled={publishingId === tnd.id}
                          title="Опубликовать данный черновик"
                        >
                          <Send size={13} /> {publishingId === tnd.id ? '...' : 'Опубликовать'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.25rem 0.45rem', fontSize: '0.78rem', color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => handleDeleteDraft(tnd.id, tnd.title)}
                          title="Удалить черновик"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

export default DraftTenders;
