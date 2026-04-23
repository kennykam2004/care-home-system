import api from './client';

export const authApi = {
  login: async (employeeId: string, password: string) => {
    const { data } = await api.post('/auth/login', { employeeId, password });
    return data;
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  refresh: async () => {
    const { data } = await api.post('/auth/refresh');
    return data;
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};
