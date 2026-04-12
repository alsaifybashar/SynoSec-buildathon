import { useEffect, useRef, useState } from "react";
import type { WsEvent } from "@synosec/contracts";

interface UseScanWebSocketResult {
  lastEvent: WsEvent | null;
  isConnected: boolean;
}

export function useScanWebSocket(enabled = true): UseScanWebSocketResult {
  const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      setLastEvent(null);
      setIsConnected(false);
      return () => {
        mountedRef.current = false;
      };
    }

    function connect() {
      if (!mountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) setIsConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(String(event.data)) as WsEvent;
          setLastEvent(parsed);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [enabled]);

  return { lastEvent, isConnected };
}
