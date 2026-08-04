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
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setTenders(items);
    } catch (err) {
      console.warn(`API fetch notice for ${type} tenders:`, err);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  return { tenders, loading, error, refetch: fetchTenders };
};
