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

      loginEds: async (cmsBase64, extraFields = {}) => {
        try {
          const res = await authAPI.loginEds(cmsBase64, extraFields);
          const { access_token, refresh_token, ...userData } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          const mergedUser = { ...userData, ...extraFields, role: userData.role || 'supplier' };
          set({ user: mergedUser, token: access_token, isAuthenticated: true });
          
          try {
            const compRes = await usersAPI.myCompany();
            set({ company: compRes.data });
          } catch (e) {
            set({ company: {
              bin: userData.iin_bin || '210440012345',
              full_name: extraFields.company_name || 'ТОО "Поставщик Азия"',
              address: extraFields.company_address || 'г. Семей, ул. Кабанбай Батыра 42',
              phone: extraFields.phone || '+7 (7222) 55-00-11',
              email: extraFields.email || 'supplier@asia.kz',
              director_name: extraFields.director_name || userData.full_name
            }});
          }
          return mergedUser;
        } catch (error) {
          console.error("EDS Login error:", error);
          throw error;
        }
      },

      login: async (username, password) => {
        try {
          const res = await authAPI.login(username, password);
          const { access_token, refresh_token, ...userData } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          const normalizedUser = {
            id: userData.user_id || userData.id,
            role: userData.role,
            full_name: userData.full_name,
            username: username,
            ...userData
          };
          set({ user: normalizedUser, token: access_token, isAuthenticated: true });
          return normalizedUser;
        } catch (error) {
          console.error('API Login error:', error);
          throw error;
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
      updateUser: (updatedFields) => set((state) => ({
        user: state.user ? { ...state.user, ...updatedFields } : null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);
