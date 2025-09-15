const express = require('express');
const geolib = require('geolib');
const auth = require('../middleware/auth');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

const router = express.Router();

// Mark attendance
router.post('/mark-attendance', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    const { token, latitude, longitude, courseId } = req.body;

    if (!token || !latitude || !longitude || !courseId) {
      return res.status(400).json({ 
        message: 'Missing required fields: token, latitude, longitude, courseId' 
      });
    }

    // Find the course and check if student is enrolled
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (!course.students.includes(req.user.id)) {
      return res.status(403).json({ message: 'You are not enrolled in this course' });
    }

    // Check if session is active and token is valid
    if (!course.activeSession.isActive) {
      return res.status(400).json({ message: 'No active attendance session' });
    }

    if (course.activeSession.currentToken !== token) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (new Date() > course.activeSession.tokenExpiry) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    // Validate location (within 100 meters of classroom)
    const classroomCoords = {
      latitude: course.classroomLocation.lat,
      longitude: course.classroomLocation.lon
    };

    const studentCoords = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const distance = geolib.getDistance(classroomCoords, studentCoords);
    
    if (distance > 100) { // 100 meters
      return res.status(400).json({ 
        message: `You are too far from the classroom. Distance: ${distance}m (Max allowed: 100m)` 
      });
    }

    // Check if student is already marked present for this session
    const existingAttendance = await Attendance.findOne({
      course: courseId,
      student: req.user.id,
      sessionDate: course.activeSession.sessionDate
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'You have already been marked present for this session' });
    }

    // Create attendance record
    const attendance = new Attendance({
      course: courseId,
      student: req.user.id,
      sessionDate: course.activeSession.sessionDate,
      location: {
        lat: latitude,
        lon: longitude
      }
    });

    await attendance.save();

    // Populate student info for real-time update
    await attendance.populate('student', 'name email');

    // Emit real-time update to faculty dashboard
    req.io.to(`faculty-${courseId}`).emit('student-present', {
      studentName: req.user.name,
      studentEmail: req.user.email,
      timestamp: attendance.timestamp,
      distance: distance
    });

    res.json({
      message: 'Attendance marked successfully',
      timestamp: attendance.timestamp,
      distance: distance
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    
    // Handle duplicate key error (student already marked present)
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'You have already been marked present for this session' 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's courses
router.get('/courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    const courses = await Course.find({ 
      students: req.user.id 
    }).populate('faculty', 'name email');

    res.json(courses);
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's attendance history
router.get('/attendance-history', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Students only.' });
    }

    const attendance = await Attendance.find({ 
      student: req.user.id 
    }).populate('course', 'courseName')
      .sort({ timestamp: -1 });

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;