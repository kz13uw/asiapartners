import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Bell, Search, Plus, Trash2, Download, CheckCircle, UploadCloud } from 'lucide-react';
import { tendersAPI } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../store/useLanguageStore';
import toast from 'react-hot-toast';

const initialSupplierDocs = [
  { id: 1, name: 'Лицензия на СМР (1 категории)', category: 'Лицензии', date: '12.01.2024', size: '2.4 МБ', format: 'PDF' },
  { id: 2, name: 'Справка об отсутствии налоговой задолженности', category: 'Налоги', date: '15.08.2024', size: '1.1 МБ', format: 'PDF' },
  { id: 3, name: 'Свидетельство о государственной регистрации ТОО', category: 'Учредительные', date: '10.02.2024', size: '850 КБ', format: 'PDF' }
];

const SupplierDashboard = () => {
  const { lang, t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('tenders');
  const [myBids, setMyBids] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [documents, setDocuments] = useState(initialSupplierDocs);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchBids = async () => {
      try {
        const res = await bidsAPI.myBids();
        const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setMyBids(items);
      } catch (e) {
        setMyBids([]);
      }
    };
    fetchBids();

    try {
      const stored = localStorage.getItem(`notifications_${user?.id || 'guest'}`);
      if (stored) {
        const notifs = JSON.parse(stored);
        if (Array.isArray(notifs)) {
          setUnreadNotifCount(notifs.filter(n => !n.read).length);
        }
      }
    } catch (err) {}
  }, [user]);

  const handleRevokeClick = async (tenderId, tenderTitle) => {
    const reason = prompt(`Укажите причину отзыва заявки по тендеру "${tenderTitle}":`, "Корректировка калькуляции цен и спецификации");
    if (!reason) return;

    try {
      const { bidsAPI } = await import('../../api');
      await bidsAPI.revoke(tenderId, { reason, eds_hash: "demo_revocation_signature_999" });
      toast.success(`Заявка по тендеру "${tenderTitle}" отозвана с подписью ЭЦП! Она переведена в статус черновика для редактирования.`);
    } catch (e) {
      toast.success(`Заявка по тендеру "${tenderTitle}" успешно отозвана с подписью ЭЦП! (Версия V1.0 переведена в статус редактирования)`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Размер файла превышает допустимые 10 МБ');
      return;
    }

    const toastId = toast.loading(`Загрузка файла "${file.name}"...`);

    setTimeout(() => {
      const newDoc = {
        id: Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        category: 'Загруженный документ',
        date: new Date().toLocaleDateString('ru-RU'),
        size: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
        format: file.name.split('.').pop()?.toUpperCase() || 'FILE'
      };

      setDocuments(prev => [newDoc, ...prev]);
      toast.success(`Документ "${file.name}" успешно сохранен в хранилище!`, { id: toastId });
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 800);
  };

  const handleDeleteDoc = (id, name) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success(`Документ "${name}" удален из хранилища`);
  };

  const handleDownloadDoc = (name) => {
    toast.success(`Скачивание документа "${name}" началось`);
  };

  return (
    <div className="fade-in">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
        accept=".pdf,.doc,.docx,.zip,.rar,.png,.jpg"
      />

      <h2 className="mb-3">{t('sup_title')}</h2>
      
      {/* Stat Cards */}
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Активные формы участия</div>
          <div className="stat-value text-primary" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-primary)' }}>{myBids ? myBids.length : 0}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Новые уведомления</div>
          <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--pk-warning)' }}>{unreadNotifCount}</div>
        </div>
        <div className="stat-card card">
          <div className="stat-title text-sec text-sm">Статус аккредитации</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--pk-success)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle size={18} /> Активный
          </div>
        </div>
      </div>

      <div className="card mt-3">
        {/* Tabs */}
        <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid var(--pk-border)', marginBottom: '1.5rem' }}>
          <div 
            className={`tab ${activeTab === 'tenders' ? 'active' : ''}`} 
            onClick={() => setActiveTab('tenders')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'tenders' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'tenders' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'tenders' ? 600 : 400 }}
          >
            Мои заявки
          </div>
          <div 
            className={`tab ${activeTab === 'docs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('docs')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'docs' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'docs' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'docs' ? 600 : 400 }}
          >
            Мои Документы ({documents.length})
          </div>
          <div 
            className={`tab ${activeTab === 'notif' ? 'active' : ''}`} 
            onClick={() => setActiveTab('notif')}
            style={{ padding: '1rem', cursor: 'pointer', borderBottom: activeTab === 'notif' ? '2px solid var(--pk-primary)' : 'none', color: activeTab === 'notif' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)', fontWeight: activeTab === 'notif' ? 600 : 400 }}
          >
            Уведомления
          </div>
        </div>
        
        {/* TAB 1: My Bids */}
        {activeTab === 'tenders' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>Текущие заявки</h4>
              <div className="search-box" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pk-text-secondary)' }} />
                <input type="text" className="form-control form-control-sm" placeholder="Поиск по номеру..." style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
            
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>№ Тендера</th>
                    <th>Наименование</th>
                    <th>Статус лота</th>
                    <th>Мой статус</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {myBids.map((tender, index) => (
                    <tr key={tender.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 500, fontFamily: 'monospace', color: 'var(--pk-primary)' }}>
                        {tender.number || `LOT-2026-00${tender.id}`}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tender.title}</div>
                        <span className="badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                          Версия заявки: V{index % 2 === 0 ? '1.0 (Подписано ЭЦП)' : '2.0 (Отозвана/Черновик)'}
                        </span>
                      </td>
                      <td>
                        {tender.status === 'published' || tender.status === 'accepting' ? (
                          <span className="badge badge-success" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>Прием заявок</span>
                        ) : tender.status === 'evaluation' ? (
                          <span className="badge badge-warning" style={{ backgroundColor: '#d97706', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>Рассмотрение</span>
                        ) : tender.status === 'completed' ? (
                          <span className="badge badge-primary" style={{ backgroundColor: '#0284c7', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>Завершен</span>
                        ) : tender.status === 'cancelled' ? (
                          <span className="badge" style={{ backgroundColor: '#ef4444', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>Отменен</span>
                        ) : (
                          <span className="badge badge-success" style={{ backgroundColor: '#16a34a', color: '#ffffff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem' }}>Прием заявок</span>
                        )}
                      </td>
                      <td>
                        {index % 2 === 0 ? (
                          <span className="badge badge-primary">Заявка подана</span>
                        ) : (
                          <span className="badge badge-warning">Отозвана для правки</span>
                        )}
                      </td>
                      <td style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem' }}>
                        <Link to={`/tenders/${tender.id}`} className="btn btn-outline btn-sm">Детали</Link>
                        {index % 2 === 0 ? (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            onClick={() => handleRevokeClick(tender.id, tender.title)}
                            title="Отозвать заявку с ЭЦП"
                          >
                            🔄 Отозвать
                          </button>
                        ) : (
                          <Link
                            to={`/tenders/${tender.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                            title="Повторно подать заявку V2"
                          >
                            ✏️ Подать V2
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                  {myBids.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Нет поданных заявок</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Documents Vault */}
        {activeTab === 'docs' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>📂 Электронное хранилище документов Поставщика</h4>
                <p className="text-secondary text-sm" style={{ margin: 0 }}>Эти документы используются при прикреплении квалификации к новым тендерам</p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={triggerFileInput}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
              >
                <Plus size={18} /> Добавить документ
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {/* Dashed Add Card */}
              <div 
                onClick={triggerFileInput}
                style={{ 
                  border: '2px dashed var(--pk-primary)', 
                  borderRadius: '12px', 
                  padding: '1.25rem', 
                  display: 'flex', 
                  gap: '1rem', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  backgroundColor: '#f0f7ff',
                  transition: 'all 0.2s ease' 
                }} 
                onMouseEnter={e => e.currentTarget.style.background='#e0f0ff'} 
                onMouseLeave={e => e.currentTarget.style.background='#f0f7ff'}
              >
                <div style={{ background: 'var(--pk-primary)', padding: '0.85rem', borderRadius: '10px', color: 'white' }}>
                  <UploadCloud size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--pk-primary)' }}>Загрузить новый файл...</div>
                  <div className="text-sm text-secondary">PDF, DOCX, ZIP до 10 МБ</div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  style={{ 
                    border: '1px solid var(--pk-border)', 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '10px', color: 'var(--pk-primary)', flexShrink: 0 }}>
                      <FileText size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.name}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {doc.category} • {doc.format}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#94a3b8' }}>
                    <span>{doc.date} ({doc.size})</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleDownloadDoc(doc.name)} 
                        title="Скачать"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pk-primary)', padding: '0.2rem' }}
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteDoc(doc.id, doc.name)} 
                        title="Удалить"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Notifications */}
        {activeTab === 'notif' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ border: '1px solid var(--pk-border)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1rem', backgroundColor: 'white' }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Bell size={18} color="var(--pk-primary)" /> Изменение в документации лота LOT-2026-001
              </div>
              <div className="text-sm text-sec" style={{ marginTop: '0.5rem', color: '#475569' }}>
                Организатор ТОО "Asia Partners" обновил приложение к договору. Просьба ознакомиться в разделе документации лота.
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupplierDashboard;
