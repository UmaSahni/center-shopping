import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (!socket && authToken) {
    socket = io(SOCKET_URL, {
      auth: { token: authToken },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Real-Time Order Socket server');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket server:', reason);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
