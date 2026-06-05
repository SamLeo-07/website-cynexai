import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add Authorization token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("attendance_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        // Token expired or invalid, clear localStorage and redirect to login
        localStorage.removeItem("attendance_token");
        localStorage.removeItem("attendance_user");
        if (window.location.pathname !== "/attendance/login") {
          window.location.href = "/attendance/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
