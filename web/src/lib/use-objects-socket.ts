"use client";

import { useEffect, useRef, useState } from "react";

import type { ApiObject } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface UseObjectsSocketOptions {
  onCreated: (object: ApiObject) => void;
  onDeleted: (id: string) => void;
}

/**
 * Subscribes to the API's realtime `object:created` / `object:deleted`
 * events for as long as the calling component is mounted, and reports the
 * current connection status.
 */
export function useObjectsSocket({
  onCreated,
  onDeleted,
}: UseObjectsSocketOptions): boolean {
  // Always start `false` so the first client render matches the server-rendered
  // HTML (no socket exists during SSR) — the effect below syncs it to the
  // socket's actual state right after mount instead of during render.
  const [connected, setConnected] = useState(false);
  const onCreatedRef = useRef(onCreated);
  const onDeletedRef = useRef(onDeleted);

  // Keep the latest callbacks available to the subscription effect below
  // without needing to re-subscribe on every render.
  useEffect(() => {
    onCreatedRef.current = onCreated;
    onDeletedRef.current = onDeleted;
  });

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleCreated = (object: ApiObject) => onCreatedRef.current(object);
    const handleDeleted = (payload: { id: string }) =>
      onDeletedRef.current(payload.id);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("object:created", handleCreated);
    socket.on("object:deleted", handleDeleted);

    // The socket may have already connected before this effect ran (e.g. a
    // singleton reused from a prior mount) — sync the real state now.
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("object:created", handleCreated);
      socket.off("object:deleted", handleDeleted);
    };
  }, []);

  return connected;
}
