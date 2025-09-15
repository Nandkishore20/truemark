const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty');
const studentRoutes = require('./routes/student');

const app = express();
const server = http.createServer(app);

// Get the frontend URL from environment variables for flexibility
const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
const frontendIPURL = `http://${process.env.YOUR_PC_IP || '192.168.1.3'}:3000`;


// Initialize Socket.io with a more robust CORS configuration
const io = socketIo(server, {
  cors: {
    origin: [frontendURL, frontendIPURL], // Allow both localhost and your specific IP
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-faculty-room', (courseId) => {
    socket.join(`faculty-${courseId}`);
    console.log(`Faculty joined room: faculty-${courseId}`);
  });

  socket.on('join-student-room', (courseId) => {
    socket.join(`student-${courseId}`);
    console.log(`Student joined room: student-${courseId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});