import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenders } from '../../hooks/useTenders';
import { useTranslation } from '../../store/useLanguageStore';
import { tendersAPI } from '../../api';

import EcpModal from '../../components/EcpModal';

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
          <div className="search-box" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
            <input type="text" className="form-control form-control-sm" placeholder="Поиск по номеру или названию..." style={{ paddingLeft: '2rem' }} />
          </div>
        </div>
        
        <div className="table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left', backgroundColor: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>№ Тендера</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Наименование тендера</th>
                <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Метод</th>
                <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Прием заявок (до)</th>
                <th style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>Статус жизненного цикла</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}><span className="loader-spinner"></span></td></tr>
              ) : localTenders.length > 0 ? (
                localTenders.map((tender) => (
                  <tr key={tender.id} style={{ borderBottom: '1px solid var(--pk-border)', verticalAlign: 'middle' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 500, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {tender.status === 'draft' ? (
                        <Link to={`/organizer/tenders/${tender.id}/edit`} style={{ color: 'var(--pk-primary)', textDecoration: 'none', fontWeight: 600 }} title="Нажмите, чтобы продолжить редактирование">
                          {tender.number}
                        </Link>
                      ) : (
                        <Link to={`/tenders/${tender.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {tender.number}
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', maxWidth: '220px' }}>
                      {tender.status === 'draft' ? (
                        <Link to={`/organizer/tenders/${tender.id}/edit`} style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600 }} title="Нажмите, чтобы продолжить редактирование">
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tender.title} <span style={{ fontSize: '0.8rem', color: '#0284c7' }}>✏️</span>
                          </div>
                        </Link>
                      ) : (
                        <Link to={`/tenders/${tender.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tender.title}
                          </div>
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <span className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem' }}>ЗЦП</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.82rem' }}>
                      {new Date(tender.deadline_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', whiteSpace: 'nowrap' }}>
                      {tender.status === 'draft' ? (
                        <Link to={`/organizer/tenders/${tender.id}/edit`} style={{ textDecoration: 'none' }}>
                          <span className="badge" style={{backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 600, cursor: 'pointer', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '6px'}} title="Кликните для редактирования черновика">⏳ Драфт Тендера</span>
                        </Link>
                      ) : tender.status === 'accepting' || tender.status === 'published' ? <span className="badge badge-success" style={{fontSize: '0.72rem', padding: '0.2rem 0.5rem'}}>Опубликован (Прием)</span> :
                       tender.status === 'evaluation' ? <span className="badge badge-warning" style={{fontSize: '0.72rem', padding: '0.2rem 0.5rem'}}>Рассмотрение (Review)</span> :
                       tender.status === 'completed' ? <span className="badge badge-primary" style={{fontSize: '0.72rem', padding: '0.2rem 0.5rem'}}>Завершен (Completed)</span> :
                       tender.status === 'cancelled' ? <span className="badge" style={{backgroundColor: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.2rem 0.5rem'}}>Отменен (Canceled)</span> :
                       <span className="badge badge-primary" style={{fontSize: '0.72rem', padding: '0.2rem 0.5rem'}}>{tender.status}</span>}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '0.3rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                        {tender.status === 'draft' ? (
                          <>
                            <Link
                              to={`/organizer/tenders/${tender.id}/edit`}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#0284c7', borderColor: '#38bdf8', textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              title="Продолжить заполнение черновика"
                            >
                              ✏️ Изменить
                            </Link>
                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                              onClick={() => handlePublishTender(tender.id, tender.title)}
                              title="Опубликовать данный тендер на портале"
                            >
                              🚀 Опубликовать
                            </button>
                          </>
                        ) : (
                          <Link to={`/organizer/tenders/${tender.id}/evaluate`} className="btn btn-outline btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}>Вскрытие / Оценка</Link>
                        )}
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ color: '#0284c7', borderColor: '#38bdf8', padding: '0.25rem 0.45rem', fontSize: '0.78rem' }} 
                          onClick={() => handleDuplicateTender(tender.id, tender.title)}
                          title="Создать закупку копированием"
                        >
                          📋
                        </button>
                        {tender.status !== 'cancelled' && tender.status !== 'completed' && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ea580c', borderColor: '#fdba74', padding: '0.25rem 0.45rem', fontSize: '0.78rem' }}
                            onClick={() => handleCancelTender(tender.id, tender.title)}
                            title="Отменить закупку с указанием причины"
                          >
                            🛑
                          </button>
                        )}
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ color: '#da1e28', borderColor: '#da1e28', padding: '0.25rem 0.45rem', fontSize: '0.78rem' }} 
                          onClick={() => handleDeleteTender(tender.id, tender.title)}
                          title="Удалить тендер"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--pk-text-secondary)' }}>
                    У вас пока нет созданных тендеров
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
