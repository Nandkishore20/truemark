const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

const router = express.Router();

// Active sessions storage (in production, use Redis)
const activeSessions = new Map();

// Generate secure token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create a new course
router.post('/courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }

    const { courseName, classroomLat, classroomLon } = req.body;

    const newCourse = new Course({
      courseName,
      faculty: req.user.id,
      'classroomLocation.lat': classroomLat,
      'classroomLocation.lon': classroomLon,
    });

    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get faculty courses
router.get('/courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }

    const courses = await Course.find({ faculty: req.user.id })
      .populate('students', 'name email')
      .populate('faculty', 'name email');

    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start attendance session
router.post('/start-session', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }

    const { courseId } = req.body;

    const course = await Course.findOne({
      _id: courseId,
      faculty: req.user.id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const sessionDate = new Date().toISOString().split('T')[0];
    const token = generateToken();
    const tokenExpiry = new Date(Date.now() + 10000); // 10 seconds

    // Update course with session info
    course.activeSession = {
      isActive: true,
      currentToken: token,
      tokenExpiry,
      sessionDate
    };

    await course.save();

    // Store session data
    activeSessions.set(courseId, {
      token,
      expiry: tokenExpiry,
      sessionDate,
      courseId
    });

    // Emit initial token to faculty dashboard
    req.io.to(`faculty-${courseId}`).emit('new-token', {
      token,
      expiry: tokenExpiry.toISOString()
    });

    // Set up token refresh interval
    const refreshInterval = setInterval(async () => {
      const session = activeSessions.get(courseId);
      if (!session || new Date() > new Date(session.expiry)) {
        clearInterval(refreshInterval);

        // Mark session as inactive
        await Course.findByIdAndUpdate(courseId, {
          'activeSession.isActive': false
        });

        activeSessions.delete(courseId);
        req.io.to(`faculty-${courseId}`).emit('session-ended');
        return;
      }

      // Generate new token
      const newToken = generateToken();
      const newExpiry = new Date(Date.now() + 10000);

      // Update course and session
      await Course.findByIdAndUpdate(courseId, {
        'activeSession.currentToken': newToken,
        'activeSession.tokenExpiry': newExpiry
      });

      activeSessions.set(courseId, {
        ...session,
        token: newToken,
        expiry: newExpiry
      });

      // Emit new token
      req.io.to(`faculty-${courseId}`).emit('new-token', {
        token: newToken,
        expiry: newExpiry.toISOString()
      });
    }, 10000); // Refresh every 10 seconds

    res.json({
      message: 'Attendance session started',
      sessionDate,
      token,
      expiry: tokenExpiry.toISOString()
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for a course and date
router.get('/attendance/:courseId/:date', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }

    const { courseId, date } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      faculty: req.user.id
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const attendance = await Attendance.find({
      course: courseId,
      sessionDate: date
    }).populate('student', 'name email');

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;