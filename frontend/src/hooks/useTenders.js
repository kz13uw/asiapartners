import { useState, useEffect, useCallback } from 'react';
import { tendersAPI } from '../api';

export const useTenders = (type = 'all') => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = type === 'my' ? await tendersAPI.myList() : await tendersAPI.list();
      setTenders(res.data.items || res.data);
    } catch (err) {
      console.warn(`API failed, using mock data for ${type} tenders`);
      // Fallback Demo Data
      if (type === 'my') {
        setTenders([
          { id: 1, number: 'TND-2026-001', title: 'Поставка цемента М500', method: 'one_stage', deadline_at: '2026-07-01T12:00:00Z', status: 'published' },
          { id: 2, number: 'TND-2026-002', title: 'Аренда спецтехники', method: 'price_offers', deadline_at: '2026-06-25T15:00:00Z', status: 'completed' },
        ]);
      } else {
        setTenders([
          { id: 1, number: 'TND-2026-001', title: 'Поставка цемента М500', company_name: 'ТОО "Азия Мост"', method: 'one_stage', start_price: 15000000, deadline_at: '2026-07-01T12:00:00Z', status: 'published' },
          { id: 2, number: 'TND-2026-003', title: 'Закуп арматуры А500С', company_name: 'ТОО "Фирма Азия"', method: 'one_stage', start_price: 45000000, deadline_at: '2026-07-10T12:00:00Z', status: 'published' },
          { id: 3, number: 'TND-2026-004', title: 'Поставка бетона В25', company_name: 'АО "Азия Пром"', method: 'price_offers', start_price: 8500000, deadline_at: '2026-06-30T10:00:00Z', status: 'published' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  return { tenders, loading, error, refetch: fetchTenders };
};
