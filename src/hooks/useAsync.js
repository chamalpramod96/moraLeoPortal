import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Runs `fetcher` on mount (and whenever it changes) and tracks the result.
 * Pass a stable function — a module-level service call, or one wrapped in
 * useCallback. Results arriving after the component unmounts are ignored.
 *
 * Returns { data, loading, error, refetch }.
 */
export function useAsync(fetcher, initialData = null) {
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
