import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://manage.tiemmayanhmili.vn/miframe/api',
    timeout: 10000, // 10 giây
    headers: {
        'Content-Type': 'application/json',
    },
});

// CAN THIỆP TRƯỚC KHI GỬI (Interceptors Request)
apiClient.interceptors.request.use(
    (config) => {
        // Nếu bạn có lưu Token ở LocalStorage thì gắn vào đây
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// CAN THIỆP KHI NHẬN PHẢN HỒI (Interceptors Response)
apiClient.interceptors.response.use(
    (response) => {
        // Trả về dữ liệu thẳng cho Service, không cần .data nữa
        return response.data;
    },
    (error) => {
        // Xử lý lỗi tập trung (Ví dụ: 401 thì bắt Logout)
        if (error.response?.status === 401) {
            console.error("Phiên đăng nhập hết hạn!");
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;