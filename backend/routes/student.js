const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const auth = require('../middleware/auth');
// Import activeSessions from the faculty routes to share session data
const { activeSessions } = require('./faculty'); 

// @route   GET /api/student/courses
// @desc    Get all courses a student is enrolled in
router.get('/courses', auth, async (req, res) => {
    try {
        const courses = await Course.find({ students: req.user.id }).select('-students');
        res.json(courses);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/student/attendance
// @desc    Mark attendance for a course
router.post('/attendance', auth, async (req, res) => {
    const { courseId, token } = req.body;
    const io = req.io;

    // --- REAL-TIME LOGIC START ---
    const session = activeSessions.get(courseId);

    if (!session || session.token !== token || new Date() > session.expiry) {
        return res.status(400).json({ message: 'Invalid or expired QR code. Please try again.' });
    }

    if (session.markedStudents.has(req.user.id)) {
        return res.status(400).json({ message: 'Attendance already marked for this session.' });
    }
    // --- REAL-TIME LOGIC END ---

    try {
        const attendanceDate = new Date();
        attendanceDate.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            course: courseId,
            student: req.user.id,
            sessionDate: attendanceDate,
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'You have already marked attendance for this course today.' });
        }

        const newAttendance = new Attendance({
            course: courseId,
            student: req.user.id,
            sessionDate: attendanceDate,
            status: 'Present',
        });

        await newAttendance.save();
        
        // --- EMIT UPDATE TO FACULTY ---
        const user = await User.findById(req.user.id).select('name email');
        session.markedStudents.set(req.user.id, user); // Store user details

        // Convert Map to Array for sending via JSON
        const updatedStudentList = Array.from(session.markedStudents.values());
        
        io.to(`faculty-${courseId}`).emit('student-marked-update', updatedStudentList);
        // --- EMIT UPDATE END ---

        res.status(201).json({ message: 'Attendance marked successfully' });

    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   GET /api/student/courses/:courseId/attendance
// @desc    Get attendance history for a course
router.get('/courses/:courseId/attendance', auth, async (req, res) => {
    try {
        const attendance = await Attendance.find({
            student: req.user.id,
            course: req.params.courseId
        }).sort({ sessionDate: -1 });
        res.json(attendance);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;