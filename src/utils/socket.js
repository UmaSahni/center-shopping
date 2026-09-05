import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  let SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
  let socketOptions = {
    auth: { token: authToken },
    autoConnect: true,
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  };

  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && !SOCKET_URL) {
      // In production over HTTPS (Vercel), connect to same-origin with /socket.io path proxy
      SOCKET_URL = window.location.origin;
      socketOptions.path = '/socket.io';
    }
  }
  SOCKET_URL = SOCKET_URL || 'http://localhost:5000';

  if (!socket && authToken) {
    socket = io(SOCKET_URL, socketOptions);

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
