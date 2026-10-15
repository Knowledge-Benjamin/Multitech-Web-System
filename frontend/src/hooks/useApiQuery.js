import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * A flexible, resilient custom hook wrapping React Query for standard API GET requests.
 * Supports both signatures:
 *   1. useApiQuery(endpoint, queryKeyName, options)
 *   2. useApiQuery(endpoint, options)
 *
 * Automatically resolves and attaches the appropriate Bearer token (studentToken, lecturerToken, adminToken)
 * if none is explicitly provided in axiosOptions.headers.
 */
export const useApiQuery = (endpoint, param2, param3 = {}) => {
  let queryKeyName;
  let options;

  // Determine whether 2-arg or 3-arg signature was used
  if (param2 && typeof param2 === 'object' && !Array.isArray(param2)) {
    // 2-arg call: useApiQuery(endpoint, options)
    options = param2;
    queryKeyName = endpoint;
  } else {
    // 3-arg call: useApiQuery(endpoint, queryKeyName, options)
    queryKeyName = param2 || endpoint;
    options = param3;
  }

  const { queryOptions = {}, axiosOptions = {} } = options;

  // Auto-attach authorization token if not already present
  const headers = { ...(axiosOptions.headers || {}) };
  if (!headers.Authorization && !headers.authorization) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const targetUrl = endpoint || '';

    if (targetUrl.includes('/student-profile') || targetUrl.includes('/students') || currentPath.startsWith('/student')) {
      const studentToken = localStorage.getItem('studentToken');
      if (studentToken) headers.Authorization = `Bearer ${studentToken}`;
    } else if (targetUrl.includes('/lecturer') || currentPath.startsWith('/lecturer')) {
      const lecturerToken = localStorage.getItem('lecturerToken');
      if (lecturerToken) headers.Authorization = `Bearer ${lecturerToken}`;
    } else if (targetUrl.includes('/admin') || currentPath.startsWith('/admin')) {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    }
  }

  const mergedAxiosOptions = {
    ...axiosOptions,
    headers,
  };

  // Build the full URL only when endpoint is a non-empty string.
  const url = endpoint
    ? endpoint.startsWith('http')
      ? endpoint
      : `${endpoint.startsWith('/api') ? '' : API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    : null;

  return useQuery({
    queryKey: Array.isArray(queryKeyName)
      ? [...queryKeyName, mergedAxiosOptions.params]
      : [queryKeyName, endpoint, mergedAxiosOptions.params],
    queryFn: async () => {
      const response = await axios.get(url, mergedAxiosOptions);
      return response.data;
    },
    // Automatically disable the query when there is no endpoint
    enabled: !!url && (queryOptions.enabled !== false),
    ...queryOptions,
  });
};
