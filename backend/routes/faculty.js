const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// In-memory store for active sessions
const activeSessions = new Map();

// Helper to generate a random token
const generateToken = () => crypto.randomBytes(8).toString('hex');

// @route   POST /api/faculty/courses
// @desc    Create a new course
router.post('/courses', auth, async (req, res) => {
    if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const { name, code } = req.body;
        const newCourse = new Course({
            name,
            code,
            faculty: req.user.id,
        });
        const course = await newCourse.save();
        res.status(201).json(course);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/faculty/courses
// @desc    Get all courses for a faculty member
router.get('/courses', auth, async (req, res) => {
    if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const courses = await Course.find({ faculty: req.user.id }).populate('students', 'name email');
        res.json(courses);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/faculty/courses/:courseId/students
// @desc    Add a student to a course
router.post('/courses/:courseId/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ message: 'Access denied. Faculty only.' });
    }

    const { courseId } = req.params;
    const { studentEmail } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.faculty.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not the faculty for this course' });
    }

    const student = await User.findOne({ email: studentEmail, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found with that email.' });
    }

    if (course.students.includes(student._id)) {
      return res.status(400).json({ message: 'Student already enrolled in this course.' });
    }

    course.students.push(student._id);
    await course.save();
    
    const updatedCourse = await Course.findById(courseId).populate('students', 'name email');

    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// @route   POST /api/faculty/attendance/manual
// @desc    Manually mark attendance
router.post('/attendance/manual', auth, async (req, res) => {
    if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: 'Access denied' });
    }
    try {
        const { courseId, studentId, sessionDate } = req.body;

        const course = await Course.findById(courseId);
        if (!course || course.faculty.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized action for this course.' });
        }
        
        // Check if student is in the course
        if (!course.students.includes(studentId)) {
            return res.status(400).json({ message: 'Student is not enrolled in this course.' });
        }

        // Use today's date but clear the time part for consistency
        const attendanceDate = new Date(sessionDate);
        attendanceDate.setHours(0, 0, 0, 0);

        // Check for duplicate attendance
        const existingAttendance = await Attendance.findOne({
            course: courseId,
            student: studentId,
            sessionDate: attendanceDate
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for this student today.' });
        }

        const attendance = new Attendance({
            course: courseId,
            student: studentId,
            sessionDate: attendanceDate,
            status: 'Present' // Marked manually
        });

        await attendance.save();

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Manual attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   POST /api/faculty/courses/:courseId/start-session
// @desc    Start an attendance session
router.post('/courses/:courseId/start-session', auth, (req, res) => {
    if (req.user.role !== 'faculty') {
        return res.status(403).json({ message: 'Access denied' });
    }
    
    const { courseId } = req.params;
    const io = req.io;

    if (activeSessions.has(courseId)) {
        return res.status(400).json({ message: 'Session already active for this course.' });
    }

    const initialToken = generateToken();
    const tokenExpiry = new Date(Date.now() + 10000); // 10 seconds validity

    const sessionData = {
        token: initialToken,
        expiry: tokenExpiry,
        markedStudents: new Map(),
        intervalId: null,
        tokenCount: 1
    };

    activeSessions.set(courseId, sessionData);

    const refreshInterval = setInterval(() => {
        const currentSession = activeSessions.get(courseId);
        if (!currentSession || currentSession.tokenCount >= 2) {
            clearInterval(refreshInterval);
            activeSessions.delete(courseId);
            io.to(`faculty-${courseId}`).emit('session-ended');
            console.log(`Session ended for course ${courseId}`);
            return;
        }

        const newToken = generateToken();
        const newExpiry = new Date(Date.now() + 10000);

        currentSession.token = newToken;
        currentSession.expiry = newExpiry;
        currentSession.tokenCount += 1;
        
        activeSessions.set(courseId, currentSession);

        io.to(`faculty-${courseId}`).emit('new-token', {
            token: newToken,
            expiry: newExpiry.toISOString()
        });
        
    }, 10000); // Refresh every 10 seconds

    sessionData.intervalId = refreshInterval;

    res.status(200).json({
        message: 'Session started',
        token: initialToken,
        expiry: tokenExpiry.toISOString(),
        courseId,
    });
});

module.exports = { router, activeSessions };