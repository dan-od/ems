// src/config.js
const getApiUrl = () => {
  // 1. PRODUCTION: Check if we have a production API URL set
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. DEVELOPMENT: Auto-detect based on current hostname
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Running on PC - use localhost
    return 'http://localhost:3001/api'; // ← ADD /api HERE
  }
  
  // Running on iPad or other device - use current IP
  return `http://${hostname}:3001/api`; // ← ADD /api HERE
};

export const API_URL = getApiUrl();

// For debugging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API_URL configured as:', API_URL);
}