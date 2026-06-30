import apiClient from "@/app/axios/apiClient";

const AUTH_STORAGE_KEY = "nori_auth_user";

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  email: string;
  name: string;
}

export const authService = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post("/auth/login", { username, password });
    const payload = response as { user?: AuthUser; token?: string };
    const user = payload.user as AuthUser;

    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem("token", payload.token || "");
    }

    return user;
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem("token");
    }
  },

  getCurrentUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
};
