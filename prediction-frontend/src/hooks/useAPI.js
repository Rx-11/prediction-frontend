import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function useApi() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchApi = useCallback(async (endpoint, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                setLoading(false);
                return data;
            } else {
                setLoading(false);
                return { success: true };
            }
        } catch (err) {
            console.error(`API call to ${endpoint} failed:`, err);
            setError(err.message || 'An unknown API error occurred');
            setLoading(false);
            throw err; 
        }
    }, []); 

    const getCurrentPrice = useCallback(async () => {
        return fetchApi('/price');
    }, [fetchApi]);

    const getRoundDetails = useCallback(async (epoch) => {
         const params = new URLSearchParams({ epoch: String(epoch) });
         return fetchApi(`/round?${params.toString()}`);
    }, [fetchApi]);

    return { loading, error, getCurrentPrice, getRoundDetails };
}