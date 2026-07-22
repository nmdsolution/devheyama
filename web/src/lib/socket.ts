import { io, type Socket } from "socket.io-client";

import { API_URL } from "@/lib/api";

let socket: Socket | null = null;

/** Lazily creates a single shared Socket.io connection to the API. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
