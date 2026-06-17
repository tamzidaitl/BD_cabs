import { useEffect, useRef, useState } from 'react';
import { useServices } from '../query/ServicesContext';
import type { RealtimeStatus } from './connection';

export type HubHandlers = Record<string, (payload: never) => void>;

/**
 * Subscribe a component to a SignalR hub for its lifetime. Handlers are kept in
 * a ref so callers can pass inline objects without re-subscribing on every
 * render; the connection is opened on mount and torn down on unmount.
 *
 * Renderer-agnostic: depends only on `react` + the injected `createHub` service,
 * so the RN app uses it verbatim.
 */
export function useHub(hubPath: string, handlers: HubHandlers): RealtimeStatus {
  const { createHub } = useServices();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const conn = createHub(hubPath);
    const unsubscribers: Array<() => void> = [];

    for (const event of Object.keys(handlersRef.current)) {
      unsubscribers.push(
        conn.on(event, (payload) => handlersRef.current[event]?.(payload as never)),
      );
    }

    let active = true;
    setStatus('connecting');
    conn
      .start()
      .then(() => active && setStatus(conn.status()))
      .catch(() => active && setStatus('disconnected'));

    const poll = setInterval(() => active && setStatus(conn.status()), 2000);

    return () => {
      active = false;
      clearInterval(poll);
      unsubscribers.forEach((off) => off());
      void conn.stop();
    };
    // hubPath identifies the subscription; createHub is stable per app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubPath, createHub]);

  return status;
}
