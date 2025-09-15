import io from 'socket.io-client';

// Use environment variable for backend URL, with a fallback for local development
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });
      
      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
      });

      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;