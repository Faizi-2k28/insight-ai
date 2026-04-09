import { apiFetch } from '@/lib/apiClient';

export interface DashboardItem {
    id: string;
    title: string;
    description: string;
    dataset_filename: string;
    row_count: number;
    column_count: number;
    target_column: string;
    problem_type: string;
    created_at: string;
    updated_at?: string;
    // adding standard status/model since frontend uses these mock properties loosely right now
    status?: string;
    model?: string;
}

export const dashboardService = {
    getDashboards: async (): Promise<{ dashboards: DashboardItem[] }> => {
        return apiFetch('/api/upload/dashboards', {
            method: 'GET',
        });
    },
    
    getDashboardById: async (id: string): Promise<DashboardItem> => {
        return apiFetch(`/api/upload/dashboard/${id}`, {
            method: 'GET',
        });
    }
};
