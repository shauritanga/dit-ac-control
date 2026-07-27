import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ApiError, fetchOverview, fetchUnits } from '../api/client';
import { socketUrl } from '../api/config';
import type { AcUnit, AlertItem, OverviewData, Summary } from '../api/types';
import { useAuth } from '../context/AuthContext';

type LiveData = {
  summary: Summary | null;
  units: AcUnit[];
  alerts: AlertItem[];
  overview: OverviewData | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
};

export function useLiveData(): LiveData {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [units, setUnits] = useState<AcUnit[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const hasData = useRef(false);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) return;
      if (!opts?.silent) {
        if (!hasData.current) setLoading(true);
        else setRefreshing(true);
      }
      try {
        const [nextOverview, nextUnits] = await Promise.all([
          fetchOverview(token),
          fetchUnits(token),
        ]);
        if (!mounted.current) return;
        setOverview(nextOverview);
        setSummary(nextOverview.summary);
        setUnits(nextUnits);
        setAlerts(nextOverview.recentAlerts ?? []);
        setError('');
        hasData.current = true;
      } catch (err) {
        if (!mounted.current) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await logout();
          return;
        }
        setError(
          err instanceof Error ? err.message : 'Unable to load facility data.',
        );
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [token, logout],
  );

  useEffect(() => {
    mounted.current = true;
    hasData.current = false;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1500,
    });

    const onEvent = () => {
      void refresh({ silent: true });
    };
    socket.on('telemetry.updated', onEvent);
    socket.on('command.updated', onEvent);
    socket.on('alert.created', onEvent);

    return () => {
      socket.off('telemetry.updated', onEvent);
      socket.off('command.updated', onEvent);
      socket.off('alert.created', onEvent);
      socket.disconnect();
    };
  }, [token, refresh]);

  return {
    summary,
    units,
    alerts,
    overview,
    loading,
    refreshing,
    error,
    refresh,
  };
}
