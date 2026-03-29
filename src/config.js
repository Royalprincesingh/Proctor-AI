// Frontend environment configuration
// This file loads environment-specific configuration using Vite's import.meta.env

const config = {
  development: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
    FRONTEND_URL: 'http://localhost:5175', // Updated to current port
    DEBUG: true,
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.proctorai.com/api',
    FRONTEND_URL: 'https://proctorai.com',
    DEBUG: false,
  },
};

export default config[import.meta.env.MODE || 'development'];
