import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_FOOD_URL || "http://localhost:3003",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("food_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("food_token");
      localStorage.removeItem("food_companyId");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
