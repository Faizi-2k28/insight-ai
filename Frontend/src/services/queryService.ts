import { apiFetch } from '@/lib/apiClient';

export const queryService = {
    askQuestion: async (dashboardId: string, question: string) => {
        return apiFetch(`/api/query/ask/${dashboardId}`, {
            method: 'POST',
            body: JSON.stringify({ question })
        });
    },

    getHistory: async (dashboardId: string, limit: number = 20) => {
        return apiFetch(`/api/query/history/${dashboardId}?limit=${limit}`, { method: 'GET' });
    }
};
