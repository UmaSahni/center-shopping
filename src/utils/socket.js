import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  let SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && (!SOCKET_URL || SOCKET_URL.includes('localhost') || SOCKET_URL.includes('127.0.0.1'))) {
      SOCKET_URL = 'http://72.61.246.61:5000';
    }
  }
  SOCKET_URL = SOCKET_URL || 'http://localhost:5000';
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
