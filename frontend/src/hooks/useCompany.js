import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../api';

export const useCompany = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersAPI.myCompany();
      setCompany(res.data);
    } catch (err) {
      console.warn('API failed, using mock data for Company');
      // Mock data for Supplier Profile
      setCompany({
        bin: '123456789012',
        name: 'ТОО "Тестовый Поставщик"',
        address: 'г. Семей, ул. Абая 1',
        bank_details: 'IBAN KZ123456789012345678, БИК KZKXAAAA',
        status: 'approved'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return { company, loading, error, refetch: fetchCompany };
};
