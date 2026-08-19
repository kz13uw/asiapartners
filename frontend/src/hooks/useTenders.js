import { useState, useEffect, useCallback } from 'react';
import { tendersAPI } from '../api';
import { useAuthStore } from '../store/authStore';

export const getStoredLocalDrafts = (currentUser) => {
  try {
    const data = localStorage.getItem('organizer_draft_tenders');
    const all = data ? JSON.parse(data) : [];
    const user = currentUser || useAuthStore.getState().user;
    if (!user) return all; // fallback for unauthenticated calls
    const userId = user.id || user.user_id;
    const userCode = user.account_code;
    return all.filter(d => 
      (!d.organizer_id || d.organizer_id === userId) && 
      (!d.organizer_code || !userCode || d.organizer_code === userCode)
    );
  } catch (e) {
    return [];
  }
export const removeLocalDraft = (draftId) => {
  try {
    const data = localStorage.getItem('organizer_draft_tenders');
    if (!data) return;
    const current = JSON.parse(data);
    const updated = current.filter(d => String(d.id) !== String(draftId));
    localStorage.setItem('organizer_draft_tenders', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
};

export const saveLocalDraft = (draft, currentUser) => {
  try {
    const data = localStorage.getItem('organizer_draft_tenders');
    const current = data ? JSON.parse(data) : [];
    const user = currentUser || useAuthStore.getState().user;
    const userId = user?.id || user?.user_id;
    const userCode = user?.account_code;
    const enrichedDraft = {
      ...draft,
      organizer_id: userId || draft.organizer_id,
      organizer_code: userCode || draft.organizer_code
    };
    const existsIndex = current.findIndex(d => d.id === draft.id);
    let updated;
    if (existsIndex >= 0) {
      updated = [...current];
      updated[existsIndex] = { ...updated[existsIndex], ...enrichedDraft };
    } else {
      updated = [enrichedDraft, ...current];
    }
    localStorage.setItem('organizer_draft_tenders', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
};

export const useTenders = (type = 'all') => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    setError(null);
    const currentUser = useAuthStore.getState().user;
    const localDrafts = getStoredLocalDrafts(currentUser);
    try {
      const res = type === 'my' ? await tendersAPI.myList() : await tendersAPI.list();
      const dbItems = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      
      const dbIds = new Set(dbItems.map(i => i.id));
      const uniqueLocalDrafts = type === 'my' ? localDrafts.filter(d => !dbIds.has(d.id)) : [];

      setTenders([...dbItems, ...uniqueLocalDrafts]);
    } catch (err) {
      console.warn(`API fetch notice for ${type} tenders:`, err);
      setTenders(type === 'my' ? localDrafts : []);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchTenders();
  }, [fetchTenders]);

  return { tenders, loading, error, refetch: fetchTenders };
};
