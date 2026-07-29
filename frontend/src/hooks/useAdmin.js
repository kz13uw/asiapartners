import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api';

let mockUsers = [
  { id: 1, iin_bin: '123456789012', full_name: 'Иванов Иван Иванович', email: 'ivanov@supplier.kz', role: 'supplier', status: 'active' },
  { id: 2, iin_bin: '987654321012', full_name: 'Сотрудник Фирма Азия', email: 'zakuptender@asia.kz', role: 'organizer', status: 'active' },
  { id: 3, iin_bin: '555555555555', full_name: 'Сидоров Сидор', email: 'sidorov@supplier.kz', role: 'supplier', status: 'blocked' },
];

export const useAdmin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
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
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.warn('API failed, using mock data for Admin');
      setStats({ total_tenders: 24, total_users: mockUsers.length + 139, total_companies: 18, total_bids: 89 });
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

  return { users, stats, loading, error, refetch: fetchData, addMockUser, updateMockUserStatus };
};
