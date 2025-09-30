// src/config.js
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // If accessing from localhost (your PC), use localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If accessing from iPad or any other device, use the device's hostname with port 3001
  return `http://${hostname}:3001`;
};

export const API_URL = getApiUrl();