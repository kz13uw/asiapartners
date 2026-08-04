import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api';

let mockUsers = [];

export const useAdmin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total_tenders: 0, total_users: 1, total_companies: 0, total_bids: 0 });
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
      setUsers(usersRes.data || []);
      setStats(statsRes.data || { total_tenders: 0, total_users: 1, total_companies: 0, total_bids: 0 });
    } catch (err) {
      console.warn('API fetch notice:', err);
      setStats({ total_tenders: 0, total_users: mockUsers.length + 1, total_companies: 0, total_bids: 0 });
      setUsers([...mockUsers]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMockUser = (user) => {
    mockUsers.push({ id: Date.now(), status: 'active', ...user });
    fetchData();
  };

  const updateMockUserStatus = (id, isBlocked) => {
    mockUsers = mockUsers.map(u => u.id === id ? { ...u, status: isBlocked ? 'blocked' : 'active' } : u);
    fetchData();
  };

  const deleteMockUser = (id) => {
    mockUsers = mockUsers.filter(u => u.id !== id);
    fetchData();
  };

  return { users, stats, loading, error, refetch: fetchData, addMockUser, updateMockUserStatus, deleteMockUser };
};
