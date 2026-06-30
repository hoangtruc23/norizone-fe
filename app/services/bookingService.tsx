import apiClient from "@/app/axios/apiClient";

export const bookingService = {
    getAll: async (params?: any) => {
        const response = await apiClient.get('/booking/getAll', { params });
        return response.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/booking/create', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/booking/update/${id}`, data);
        return response.data;
    },
    // delete: async (id: string) => {
    //     const response = await axios.delete(`/api/models/${id}`);
    //     return response.data;
    // }
};