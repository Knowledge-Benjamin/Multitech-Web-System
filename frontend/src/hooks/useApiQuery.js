import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * A custom hook wrapping React Query for standard API GET requests.
 * @param {string|null} endpoint - The API endpoint to fetch (e.g., '/programmes'). Pass null to skip.
 * @param {string|Array} queryKeyName - A unique string/array to identify this query in the cache
 * @param {object} options - Optional configuration for React Query and Axios
 * @returns {object} React Query result object (data, isLoading, isError, error, refetch, etc.)
 */
export const useApiQuery = (endpoint, queryKeyName, options = {}) => {
  const { queryOptions = {}, axiosOptions = {} } = options;

  // Build the full URL only when endpoint is a non-empty string.
  const url = endpoint
    ? endpoint.startsWith('http')
      ? endpoint
      : `${endpoint.startsWith('/api') ? '' : API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    : null;

  return useQuery({
    queryKey: Array.isArray(queryKeyName)
      ? [...queryKeyName, axiosOptions.params]
      : [queryKeyName, endpoint, axiosOptions.params],
    queryFn: async () => {
      const response = await axios.get(url, axiosOptions);
      return response.data;
    },
    // Automatically disable the query when there is no endpoint
    enabled: !!url && (queryOptions.enabled !== false),
    ...queryOptions,
  });
};
