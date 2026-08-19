import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api';

const getStoredMockUsers = () => {
  try {
    const data = localStorage.getItem('admin_created_users');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredMockUsers = (users) => {
  try {
    localStorage.setItem('admin_created_users', JSON.stringify(users));
  } catch (e) {
    console.error(e);
  }
};

export const useAdmin = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total_tenders: 0, total_users: 1, total_companies: 0, total_bids: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const storedMocks = getStoredMockUsers();
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminAPI.listUsers(),
        adminAPI.stats()
      ]);
      const dbUsers = usersRes.data || [];
      
      // Combine DB users and local stored mock users without duplicates
      const dbEmails = new Set(dbUsers.map(u => u.email?.toLowerCase()).filter(Boolean));
      const dbIins = new Set(dbUsers.map(u => u.iin_bin).filter(Boolean));
      
      const uniqueMocks = storedMocks.filter(m => 
        (!m.email || !dbEmails.has(m.email.toLowerCase())) &&
        (!m.iin_bin || !dbIins.has(m.iin_bin))
      );

      const mergedUsers = [...dbUsers, ...uniqueMocks];

      setUsers(mergedUsers);
      setStats(statsRes.data ? {
        ...statsRes.data,
        total_users: (statsRes.data.total_users || 0) + uniqueMocks.length
      } : { total_tenders: 0, total_users: mergedUsers.length, total_companies: 0, total_bids: 0 });

    } catch (err) {
      console.warn('API fetch notice:', err);
      setStats({ total_tenders: 0, total_users: storedMocks.length + 1, total_companies: 0, total_bids: 0 });
      setUsers([...storedMocks]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addMockUser = (user) => {
    const currentMocks = getStoredMockUsers();
    const exists = currentMocks.some(m => 
      (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
      (m.iin_bin && user.iin_bin && m.iin_bin === user.iin_bin)
    );
    if (!exists) {
      const newUser = { id: Date.now(), status: 'active', ...user };
      const updated = [newUser, ...currentMocks];
      saveStoredMockUsers(updated);
    }
    fetchData();
  };

  const updateMockUserStatus = (id, isBlocked) => {
    const currentMocks = getStoredMockUsers();
    const updated = currentMocks.map(u => u.id === id ? { ...u, status: isBlocked ? 'blocked' : 'active' } : u);
    saveStoredMockUsers(updated);
    fetchData();
  };

  const deleteMockUser = (id) => {
    const currentMocks = getStoredMockUsers();
    const updated = currentMocks.filter(u => u.id !== id);
    saveStoredMockUsers(updated);
    fetchData();
  };

  return { users, stats, loading, error, refetch: fetchData, addMockUser, updateMockUserStatus, deleteMockUser };
};
