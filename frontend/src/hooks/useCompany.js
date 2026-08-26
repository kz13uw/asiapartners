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
      console.warn('No company profile found for user yet');
      setCompany(null);
    } finally {

      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  return { company, loading, error, refetch: fetchCompany };
};
