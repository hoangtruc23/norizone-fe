import apiClient from "@/app/axios/apiClient";

export const roomService = {
  getAll: async (params?: any) => {
    const response = await apiClient.get("/room/getAll", { params });
    return response.data;
  },
  update: async (id: string) => {
    const response = await apiClient.get(`/room/update/${id}`);
    return response.data;
  },
};
