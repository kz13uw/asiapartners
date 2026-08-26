import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api';

export const useAdmin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total_tenders: 0, total_users: 0, total_companies: 0, total_bids: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.listUsers(),
        adminAPI.stats()
      ]);
      const dbUsers = usersRes.data || [];
      setUsers(dbUsers);
      setStats(statsRes.data ? {
        ...statsRes.data,
        total_users: dbUsers.length + 1
      } : { total_tenders: 0, total_users: dbUsers.length + 1, total_companies: 0, total_bids: 0 });
    } catch (err) {
      console.warn('API fetch error in useAdmin:', err);
      setError(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMockUser = () => {
    fetchData();
  };

  const updateMockUserStatus = (id, isBlocked) => {
    fetchData();
  };

  const deleteMockUser = (id) => {
    fetchData();
  };

  return { users, stats, loading, error, refetch: fetchData, addMockUser, updateMockUserStatus, deleteMockUser };
};
