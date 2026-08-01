import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * A custom hook wrapping React Query for standard API GET requests.
 * @param {string} endpoint - The API endpoint to fetch (e.g., '/programmes')
 * @param {string} queryKeyName - A unique string to identify this query in the cache (e.g., 'programmes')
 * @param {object} options - Optional configuration for React Query and Axios
 * @returns {object} React Query result object (data, isLoading, isError, error, refetch, etc.)
 */
export const useApiQuery = (endpoint, queryKeyName, options = {}) => {
  const { queryOptions = {}, axiosOptions = {} } = options;

  // Build the full URL. If endpoint starts with 'http', use it directly.
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${endpoint.startsWith('/api') ? '' : API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  return useQuery({
    queryKey: [queryKeyName, endpoint, axiosOptions.params], // Include params in cache key
    queryFn: async () => {
      const response = await axios.get(url, axiosOptions);
      return response.data; // Return the full response data payload
    },
    ...queryOptions,
  });
};
