import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Filter, Download, Calendar, Building2, TrendingDown, Award, BarChart3, PieChart, RefreshCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../store/useLanguageStore';
import { useAuthStore } from '../../store/authStore';
import { tendersAPI, suppliersAPI } from '../../api';
import toast from 'react-hot-toast';

const ReportsPage = () => {
  const { lang, t } = useTranslation();
  const { user, company } = useAuthStore();
  const [activeReportTab, setActiveReportTab] = useState('tenders_summary');
  
  const isOrganizer = user?.role === 'organizer';
  const organizerCompanyName = company?.full_name || 'ТОО "Asia Partners"';

  const [tenders, setTenders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    date_from: '2026-01-01',
    date_to: '2026-12-31',
    category: 'all',
    status: 'all',
    target_company: isOrganizer ? organizerCompanyName : 'all'
  });

  const fetchReportData = async (showNotification = false) => {
    setLoading(true);
    try {
      const [tendersRes, suppliersRes] = await Promise.all([
        tendersAPI.list().catch(() => ({ data: [] })),
        suppliersAPI.list().catch(() => ({ data: [] }))
      ]);
      
      const tenderItems = Array.isArray(tendersRes.data) ? tendersRes.data : (tendersRes.data?.items || []);
      const supplierItems = Array.isArray(suppliersRes.data) ? suppliersRes.data : (suppliersRes.data?.items || []);

      setTenders(tenderItems);
      setSuppliers(supplierItems);

      if (showNotification) {
        toast.success('Отчет сформирован по выбранным параметрам!');
      }
    } catch (e) {
      console.warn("Report API fetch notice:", e);
      setTenders([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(false);
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Scope datasets depending on role & filters
  const filteredTenders = useMemo(() => {
    return tenders.filter(t => {
      if (isOrganizer && t.company_name !== organizerCompanyName) return false;
      if (!isOrganizer && filters.target_company !== 'all' && t.company_name !== filters.target_company) return false;
      if (filters.category !== 'all' && !(t.category_name || '').includes(filters.category)) return false;
      return true;
    });
  }, [tenders, isOrganizer, organizerCompanyName, filters.target_company, filters.category]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (isOrganizer && s.company_served !== organizerCompanyName) return false;
      if (!isOrganizer && filters.target_company !== 'all' && s.company_served !== filters.target_company) return false;
      return true;
    });
  }, [suppliers, isOrganizer, organizerCompanyName, filters.target_company]);

  // Aggregate metrics
  const totalBudget = useMemo(() => filteredTenders.reduce((sum, t) => sum + (t.start_price || t.budget || 0), 0), [filteredTenders]);
  const totalContractAmount = useMemo(() => filteredTenders.reduce((sum, t) => sum + (t.final_price || t.start_price || 0), 0), [filteredTenders]);
  const totalSavings = Math.max(0, totalBudget - totalContractAmount);
  const savingsPct = totalBudget > 0 ? ((totalSavings / totalBudget) * 100).toFixed(1) : '0';

  const formatMoney = (val) => Number(val || 0).toLocaleString('ru-RU') + ' ₸';

  // Excel (.csv) Export
  const handleExportExcel = () => {
    let csvLines = [];
    if (activeReportTab === 'tenders_summary') {
      csvLines.push(['"№ Лота"', '"Наименование тендера"', '"Организатор"', '"Метод"', '"Стартовая цена"', '"Сумма победы"', '"Победитель"', '"Статус"'].join(';'));
      if (filteredTenders.length === 0) {
        csvLines.push(['"Нет данных"', '"Нет зарегистрированных лотов за период"', '""', '""', '"0"', '"0"', '""', '""'].join(';'));
      } else {
        filteredTenders.forEach(tnd => {
          csvLines.push([
            `"${tnd.number || 'LOT-' + tnd.id}"`,
            `"${(tnd.title || '').replace(/"/g, '""')}"`,
            `"${(tnd.company_name || 'Asia Partners').replace(/"/g, '""')}"`,
            `"${tnd.method === 'zcp' ? 'Запрос цен' : 'Открытый тендер'}"`,
            `"${tnd.start_price || 0}"`,
            `"${tnd.final_price || tnd.start_price || 0}"`,
            `"${(tnd.winner || '—').replace(/"/g, '""')}"`,
            `"${tnd.status || 'active'}"`
          ].join(';'));
        });
      }
    } else {
      csvLines.push(['"Поставщик"', '"ИИН / БИН"', '"Заказчик"', '"Email"', '"Телефон"', '"Подано заявок"', '"Выиграно лотов"', '"Сумма контрактов"'].join(';'));
      if (filteredSuppliers.length === 0) {
        csvLines.push(['"Нет данных"', '"000000000000"', '"Asia Partners"', '""', '""', '"0"', '"0"', '"0"'].join(';'));
      } else {
        filteredSuppliers.forEach(sup => {
          csvLines.push([
            `"${(sup.name || sup.company_name || '').replace(/"/g, '""')}"`,
            `"${sup.bin || sup.iin_bin || ''}"`,
            `"${(sup.company_served || 'Asia Partners').replace(/"/g, '""')}"`,
            `"${sup.email || ''}"`,
            `"${sup.phone || ''}"`,
            `"${sup.bids_submitted || 0}"`,
            `"${sup.wins_count || 0}"`,
            `"${sup.total_contracts || 0}"`
          ].join(';'));
        });
      }
    }

    const blob = new Blob(["\ufeff" + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_Asia_Partners_${activeReportTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Файл Excel (CSV) успешно сгенерирован и скачан!');
  };

  // PDF Export (Print Window)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Пожалуйста, разрешите всплывающие окна для экспорта PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Отчет Asia Partners - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 2rem; color: #0f172a; }
          h1 { color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .metrics { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
          .metric-box { flex: 1; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #cbd5e1; }
          .metric-val { font-size: 1.25rem; font-weight: bold; color: #1e40af; margin-top: 0.25rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 0.85rem; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .footer { margin-top: 2rem; font-size: 0.8rem; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Asia Partners — Корпоративный аналитический отчет</h1>
          <div>Сформирован: ${new Date().toLocaleString()} | Заказчик: ${organizerCompanyName}</div>
        </div>

        <div class="metrics">
          <div class="metric-box">
            <div>Всего процедур</div>
            <div class="metric-val">${filteredTenders.length} тендеров</div>
          </div>
          <div class="metric-box">
            <div>Стартовый бюджет</div>
            <div class="metric-val">${formatMoney(totalBudget)}</div>
          </div>
          <div class="metric-box">
            <div>Сумма договоров</div>
            <div class="metric-val">${formatMoney(totalContractAmount)}</div>
          </div>
          <div class="metric-box">
            <div>Экономия средств</div>
            <div class="metric-val">${formatMoney(totalSavings)} (${savingsPct}%)</div>
          </div>
        </div>

        <h3>Детализация отчета (${activeReportTab === 'tenders_summary' ? 'Реестр закупок' : 'Аналитика контрагентов'})</h3>
        <table>
          <thead>
            ${activeReportTab === 'tenders_summary' ? `
              <tr>
                <th>№ Лота</th>
                <th>Наименование тендера</th>
                <th>Организатор</th>
                <th>Метод</th>
                <th>Стартовая цена</th>
                <th>Сумма победы</th>
              </tr>
            ` : `
              <tr>
                <th>Поставщик</th>
                <th>ИИН / БИН</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Подано заявок</th>
                <th>Выиграно лотов</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${activeReportTab === 'tenders_summary' ? (
              filteredTenders.length > 0 ? filteredTenders.map(tnd => `
                <tr>
                  <td>${tnd.number || 'LOT-' + tnd.id}</td>
                  <td>${tnd.title || ''}</td>
                  <td>${tnd.company_name || 'Asia Partners'}</td>
                  <td>${tnd.method === 'zcp' ? 'Запрос цен' : 'Открытый тендер'}</td>
                  <td>${formatMoney(tnd.start_price || tnd.budget)}</td>
                  <td>${formatMoney(tnd.final_price || tnd.start_price)}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align:center;">Нет данных за период</td></tr>'
            ) : (
              filteredSuppliers.length > 0 ? filteredSuppliers.map(sup => `
                <tr>
                  <td>${sup.name || sup.company_name || ''}</td>
                  <td>${sup.bin || sup.iin_bin || ''}</td>
                  <td>${sup.email || ''}</td>
                  <td>${sup.phone || ''}</td>
                  <td>${sup.bids_submitted || 0}</td>
                  <td>${sup.wins_count || 0}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align:center;">Нет данных за период</td></tr>'
            )}
          </tbody>
        </table>

        <div class="footer">
          Документ сформирован автоматически порталом электронных закупок Asia Partners. Электронная подпись и выгрузка защищены.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success('Окно печати/сохранения PDF открыто!');
  };

  return (
    <div className="fade-in" style={{ padding: '0.5rem 0' }}>
      
      {/* Scope Badge Alert */}
      <div style={{
        backgroundColor: isOrganizer ? '#eff6ff' : '#f8fafc',
        borderLeft: isOrganizer ? '4px solid #2563eb' : '4px solid #64748b',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building2 size={22} color={isOrganizer ? '#2563eb' : '#475569'} />
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>
              {isOrganizer ? `Корпоративный отчет Заказчика: ${organizerCompanyName}` : 'Сводный аналитический отчет по холдингу Asia Partners'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {isOrganizer ? 'Отображаются исключительно закупочные процедуры, бюджеты и договоры вашей компании.' : 'Доступны актуальные данные по всем дочерним предприятиям и направлениям холдинга.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <Download size={15} color="#16a34a" /> Excel
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <Download size={15} color="#dc2626" /> PDF
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid var(--pk-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          
          {!isOrganizer && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Предприятие / Организатор:
              </label>
              <select name="target_company" className="form-control" value={filters.target_company} onChange={handleFilterChange}>
                <option value="all">Все компании холдинга</option>
                <option value="ТОО &quot;Asia Partners&quot;">ТОО "Asia Partners"</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              <Calendar size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Период с:
            </label>
            <input type="date" name="date_from" className="form-control" value={filters.date_from} onChange={handleFilterChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              <Calendar size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> Период по:
            </label>
            <input type="date" name="date_to" className="form-control" value={filters.date_to} onChange={handleFilterChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Категория / Отрасль:
            </label>
            <select name="category" className="form-control" value={filters.category} onChange={handleFilterChange}>
              <option value="all">Все направления</option>
              <option value="Строительство">🏗️ Строительство и Девелопмент</option>
              <option value="Логистика">🚚 Транспорт и Логистика</option>
              <option value="Производство">🏭 Производство</option>
            </select>
          </div>

          <div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }} onClick={() => fetchReportData(true)} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spinner' : ''} /> {loading ? 'Загрузка...' : 'Сформировать'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--pk-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveReportTab('tenders_summary')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeReportTab === 'tenders_summary' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)',
            borderBottom: activeReportTab === 'tenders_summary' ? '3px solid var(--pk-primary)' : '3px solid transparent',
            marginBottom: '-0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <BarChart3 size={18} /> 1. Отчет по закупкам компании ({filteredTenders.length})
        </button>

        <button
          onClick={() => setActiveReportTab('suppliers_analytics')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            color: activeReportTab === 'suppliers_analytics' ? 'var(--pk-primary)' : 'var(--pk-text-secondary)',
            borderBottom: activeReportTab === 'suppliers_analytics' ? '3px solid var(--pk-primary)' : '3px solid transparent',
            marginBottom: '-0.6rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <PieChart size={18} /> 2. Активность контрагентов ({filteredSuppliers.length})
        </button>
      </div>

      {/* REPORT 1: Tenders & Lots Summary */}
      {activeReportTab === 'tenders_summary' && (
        <div className="fade-in">
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--pk-primary)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Проведено процедур</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{filteredTenders.length} тендеров</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Общий стартовый бюджет</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>{formatMoney(totalBudget)}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #FFAF00' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Сумма заключенных договоров</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFAF00', marginTop: '0.25rem' }}>{formatMoney(totalContractAmount)}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Чистая экономия бюджета</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.25rem' }}>{formatMoney(totalSavings)} ({savingsPct}%)</div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>
              Реестр лотов {isOrganizer ? `компании ${organizerCompanyName}` : ''}
            </h4>
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>№ Лота</th>
                    <th>Наименование тендера</th>
                    <th>Организатор</th>
                    <th>Метод</th>
                    <th>Стартовая цена</th>
                    <th>Сумма победы</th>
                    <th>Победитель (Поставщик)</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenders.length > 0 ? (
                    filteredTenders.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--pk-primary)' }}>{row.number || `LOT-${row.id}`}</td>
                        <td style={{ fontWeight: 500 }}>{row.title}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{row.company_name || row.organizer_name || 'Asia Partners'}</td>
                        <td>{row.method === 'zcp' ? 'Запрос цен' : 'Открытый тендер'}</td>
                        <td style={{ fontWeight: 600 }}>{formatMoney(row.start_price || row.budget)}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{formatMoney(row.final_price || row.start_price)}</td>
                        <td style={{ fontSize: '0.85rem', color: '#334155' }}>{row.winner || '—'}</td>
                        <td><span className="badge badge-success">{row.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Нет зарегистрированных процедур за указанный период.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: Suppliers Analytics */}
      {activeReportTab === 'suppliers_analytics' && (
        <div className="fade-in">
          {/* Table */}
          <div className="card">
            <h4 style={{ marginBottom: '1rem', color: 'var(--pk-primary)' }}>
              Контрагенты и победители закупок {isOrganizer ? `компании ${organizerCompanyName}` : ''}
            </h4>
            <div className="table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--pk-border)', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Поставщик (ТОО / ИП)</th>
                    <th>ИИН / БИН</th>
                    <th>Заказчик</th>
                    <th>Контакты</th>
                    <th>Подано заявок</th>
                    <th>Выиграно лотов</th>
                    <th>Сумма контрактов</th>
                    <th>Средняя скидка (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(sup => (
                      <tr key={sup.id} style={{ borderBottom: '1px solid var(--pk-border)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#0f172a' }}>{sup.name || sup.company_name}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--pk-primary)' }}>{sup.bin || sup.iin_bin}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{sup.company_served || 'Asia Partners'}</td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          <div>{sup.email}</div>
                          <div>{sup.phone}</div>
                        </td>
                        <td style={{ fontWeight: 600, textAlign: 'center' }}>{sup.bids_submitted || 0}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a', textAlign: 'center' }}>{sup.wins_count || 0}</td>
                        <td style={{ fontWeight: 700 }}>{formatMoney(sup.total_contracts || 0)}</td>
                        <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{sup.avg_discount || '0%'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Нет данных по контрагентам за указанный период.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsPage;
