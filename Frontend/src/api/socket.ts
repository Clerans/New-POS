import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';

const VITE_API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api/v1';
const SOCKET_URL = VITE_API_URL.replace('/api/v1', '').replace('/api', '');

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const accessToken = useAuthStore.getState().accessToken;
    
    socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      autoConnect: false,
      transports: ['websocket'],
    });

    // Subscribe to auth token updates to rotate socket auth claims
    useAuthStore.subscribe((state) => {
      if (state.accessToken) {
        if (socket) {
          socket.auth = { token: state.accessToken };
          if (!socket.connected) {
            socket.connect();
          }
        }
      } else {
        if (socket && socket.connected) {
          socket.disconnect();
        }
      }
    });

    // Initial connection if token is available
    if (accessToken) {
      socket.connect();
    }
  }

  return socket;
};

export default getSocket;
