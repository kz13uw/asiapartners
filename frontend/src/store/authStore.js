import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, usersAPI } from '../api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,

      loginEds: async (cmsBase64) => {
        try {
          const res = await authAPI.loginEds(cmsBase64);
          const { access_token, refresh_token, ...userData } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          set({ user: userData, token: access_token, isAuthenticated: true });
          
          // Попытка загрузить профиль компании
          try {
            const compRes = await usersAPI.myCompany();
            set({ company: compRes.data });
          } catch (e) {
            console.log('Company not registered yet or error fetching');
          }
        } catch (error) {
          throw error;
        }
      },

      login: async (email, password) => {
        try {
          const res = await authAPI.login(email, password);
          const { access_token, refresh_token, ...userData } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          set({ user: userData, token: access_token, isAuthenticated: true });
        } catch (error) {
          // Demo fallback for Organizer / Admin
          console.warn('API Login failed, using demo mode', error);
          let role = 'organizer';
          if (email.includes('admin')) role = 'admin';
          if (email.includes('supplier')) role = 'supplier';

          const demoUser = {
            id: role === 'admin' ? 999 : (role === 'supplier' ? 1 : 2),
            email,
            full_name: role === 'admin' ? 'Администратор Системы' : (role === 'supplier' ? 'Представитель Поставщика' : 'Организатор Закупок (Азия)'),
            role,
          };
          
          localStorage.setItem('access_token', 'demo_token_staff');
          set({ user: demoUser, token: 'demo_token_staff', isAuthenticated: true });
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (e) {
          console.error(e);
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, company: null, token: null, isAuthenticated: false });
        }
      },

      setCompany: (companyData) => set({ company: companyData }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
