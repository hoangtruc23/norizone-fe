import apiClient from "@/app/axios/apiClient";

export const menuService = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/menu/getAll", { params });
    return response.data;
  },
  create: async (data: any) => {
    const response = await apiClient.post("/menu/create", data);
    return response.data;
  },
  update: async (id: string) => {
    const response = await apiClient.get(`/menu/update/${id}`);
    return response.data;
  },
};
