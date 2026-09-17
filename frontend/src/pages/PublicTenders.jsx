import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Folder, CheckCircle, Clock, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { tendersAPI, categoriesAPI } from '../api';
import { useTranslation } from '../store/useLanguageStore';
import TenderRegistryTable from '../components/TenderRegistryTable';

const PublicTenders = () => {
  const { lang, t } = useTranslation();
  const [tenders, setTenders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'closed'
  const [selectedYear, setSelectedYear] = useState('all'); // 'all', '2026', '2025', '2024', '2023'
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or category_id
  const [categories, setCategories] = useState([]);

  // Пагинация (по 20 результатов на страницу)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Загрузка списка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.list();
        const cats = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setCategories(cats);
      } catch (err) {
        console.warn('Error loading categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Загрузка списка тендеров с сервера с учетом фильтров и пагинации
  useEffect(() => {
    const fetchTenders = async () => {
      setLoading(true);
      try {
        const params = {
          page: page,
          size: pageSize,
        };

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        if (statusFilter && statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (selectedYear && selectedYear !== 'all') {
          params.year = Number(selectedYear);
        }
        if (selectedCategory && selectedCategory !== 'all') {
          params.category_id = Number(selectedCategory);
        }

        const res = await tendersAPI.list(params);
        
        if (res.data) {
          const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
          const totalCount = typeof res.data.total === 'number' ? res.data.total : items.length;
          setTenders(items);
          setTotal(totalCount);
        } else {
          setTenders([]);
          setTotal(0);
        }
      } catch (err) {
        console.warn('API fetch notice:', err);
        setTenders([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTenders();
  }, [page, searchTerm, statusFilter, selectedYear, selectedCategory]);

  // Сброс страницы при изменении любого из фильтров
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSelectedYear('all');
    setSelectedCategory('all');
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="container" style={{ padding: '2rem 1rem', width: '100%', maxWidth: '1400px', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--pk-primary)' }}>
          Реестр тендеров и закупок «Asia Partners»
        </h1>
        <p className="text-sec" style={{ fontSize: '0.9rem', margin: 0 }}>
          Официальный единый реестр опубликования электронных закупок, лотов и протоколов итогов
        </p>
      </div>

      {/* Фильтры и Поиск */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Верхняя строка: Поиск по наименованию во всю ширину */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
            Поиск по наименованию, номеру или заказчику
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.4rem', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }} 
              placeholder={t('search_placeholder') || 'Введите наименование лота, № тендера или заказчика...'}
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Нижняя строка: Статус, Год, Категория и Сброс */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Статус тендера */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
              Статус тендера
            </label>
            <select 
              className="form-control" 
              value={statusFilter} 
              onChange={handleStatusChange}
              style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', width: '100%' }}
            >
              <option value="all">Все тендеры (Активные и Закрытые)</option>
              <option value="active">🟢 Активные тендеры (Прием заявок)</option>
              <option value="closed">⚪ Завершенные тендеры</option>
            </select>
          </div>

          {/* Год */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
              Год публикации
            </label>
            <select 
              className="form-control" 
              value={selectedYear} 
              onChange={handleYearChange}
              style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', width: '100%' }}
            >
              <option value="all">Все годы</option>
              <option value="2026">2026 год</option>
              <option value="2025">2025 год</option>
              <option value="2024">2024 год</option>
              <option value="2023">2023 год</option>
            </select>
          </div>

          {/* Категория */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
              Категория закупок
            </label>
            <select 
              className="form-control" 
              value={selectedCategory} 
              onChange={handleCategoryChange}
              style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', width: '100%' }}
            >
              <option value="all">Все категории</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Кнопка сброса */}
          {(searchTerm || statusFilter !== 'all' || selectedYear !== 'all' || selectedCategory !== 'all') && (
            <div>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleResetFilters}
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b', borderColor: '#cbd5e1', height: '38px' }}
              >
                <RotateCcw size={14} /> Сбросить фильтры
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Результаты поиска: статистика над таблицей */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          {loading ? 'Поиск тендеров...' : `Найдено записей: ${total}`}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Отображение по {pageSize} результатов на страницу
        </div>
      </div>

      {/* Реестр закупок списком (Официальная Таблица Goszakup Стандарт) */}
      <TenderRegistryTable 
        tenders={tenders}
        loading={loading}
        userRole="public"
        emptyText="По выбранным фильтрам тендеры не найдены"
      />

      {/* Пагинация по 20 результатов */}
      {!loading && total > pageSize && (
        <div className="card" style={{ marginTop: '1.25rem', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Страница <strong>{page}</strong> из <strong>{totalPages}</strong> (Всего результатов: {total})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Назад
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(pNum => pNum === 1 || pNum === totalPages || Math.abs(pNum - page) <= 2)
              .map((pNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && pNum - prev > 1;

                return (
                  <React.Fragment key={pNum}>
                    {showEllipsis && <span style={{ padding: '0 0.25rem', color: '#94a3b8' }}>...</span>}
                    <button
                      type="button"
                      className={`btn btn-sm ${page === pNum ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => {
                        setPage(pNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: page === pNum ? 800 : 600, minWidth: '36px' }}
                    >
                      {pNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => {
                setPage(p => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              Вперед <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTenders;
