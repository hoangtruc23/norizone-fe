import apiClient from "@/app/axios/apiClient";

export const invoiceService = {
    getAll: async (params?: any) => {
        const response = await apiClient.get('/invoice/getAll', { params });
        return response.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/invoice/create', data);
        return response.data;
    },
    getById: async (id: string) => {
        const response = await apiClient.get(`/invoice/getById/${id}`);
        return response.data;
    },
};