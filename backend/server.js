require('dotenv').config();
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const facultyRoutes = require('./routes/faculty'); // This is an object { router, activeSessions }
const studentRoutes = require('./routes/student');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io middleware to attach io to each request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes.router); // <-- The fix is here
app.use('/api/student', studentRoutes);


// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join_course_room', (courseId) => {
    socket.join(`faculty-${courseId}`);
    console.log(`A user joined room: faculty-${courseId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

const PORT = process.env.PORT || 5000;

// Listen on all network interfaces
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));