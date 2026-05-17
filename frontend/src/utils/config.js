const getBackendUrl = () => {
  // If the app is running on a live domain (production), 
  // it should call the same domain for the API.
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, use the env variable or localhost
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
};

export const BACKEND_URL = getBackendUrl();
