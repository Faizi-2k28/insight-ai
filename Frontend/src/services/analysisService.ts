import { apiFetch } from '@/lib/apiClient';

export interface ProfileResponse {
    success: boolean;
    dashboard_id: string;
    profile: any;
}

export interface ChartsResponse {
    success: boolean;
    charts: any[];
    insights?: any[];
}

export const analysisService = {
    getProfile: async (dashboardId: string): Promise<ProfileResponse> => {
        return apiFetch(`/api/analysis/profile/${dashboardId}`, { method: 'GET' });
    },
    
    getCharts: async (dashboardId: string, limit: number = 20): Promise<ChartsResponse> => {
        return apiFetch(`/api/analysis/charts/${dashboardId}?num_charts=${limit}`, { method: 'GET' });
    }
};
