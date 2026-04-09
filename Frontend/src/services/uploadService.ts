import { apiFetch } from '@/lib/apiClient';

export const uploadService = {
    validateFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch('/api/upload/validate', {
            method: 'POST',
            body: formData,
        });
    },

    createDashboard: async (
        file: File,
        title: string,
        target_column: string,
        problem_type: string,
        description?: string
    ) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('target_column', target_column);
        formData.append('problem_type', problem_type);
        if (description) formData.append('description', description);

        return apiFetch('/api/upload/create-dashboard', {
            method: 'POST',
            body: formData,
        });
    }
};
