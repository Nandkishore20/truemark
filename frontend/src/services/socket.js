import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket = null;

  connect() {
    this.socket = io(SOCKET_URL);
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinFacultyRoom(courseId) {
    if (this.socket) {
      this.socket.emit('join-faculty-room', courseId);
    }
  }

  joinStudentRoom(courseId) {
    if (this.socket) {
      this.socket.emit('join-student-room', courseId);
    }
  }

  onNewToken(callback) {
    if (this.socket) {
      this.socket.on('new-token', callback);
    }
  }

  onStudentPresent(callback) {
    if (this.socket) {
      this.socket.on('student-present', callback);
    }
  }

  onSessionEnded(callback) {
    if (this.socket) {
      this.socket.on('session-ended', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();