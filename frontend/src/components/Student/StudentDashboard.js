import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import QRCodeScanner from './QRCodeScanner';

const StudentDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCourses();
    fetchAttendanceHistory();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/student/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setMessage({
        text: 'Failed to load courses',
        type: 'error'
      });
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await api.get('/student/attendance-history');
      setAttendanceHistory(response.data);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (result) => {
    setShowScanner(false);
    setMessage({
      text: result.message,
      type: result.success ? 'success' : 'error'
    });
    
    if (result.success) {
      // Refresh attendance history
      fetchAttendanceHistory();
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getAttendanceStats = () => {
    const stats = {};
    attendanceHistory.forEach(record => {
      const courseName = record.course.courseName;
      stats[courseName] = (stats[courseName] || 0) + 1;
    });
    return stats;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Student Dashboard</h1>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowScanner(!showScanner)}
          style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
        >
          {showScanner ? 'Close Scanner' : 'Mark My Attendance'}
        </button>
      </div>

      {showScanner && (
        <QRCodeScanner 
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Enrolled Courses */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>My Courses</h2>
        <div className="courses-grid">
          {courses.map(course => {
            const stats = getAttendanceStats();
            const attendanceCount = stats[course.courseName] || 0;
            
            return (
              <div key={course._id} className="course-card">
                <h3 className="course-name">{course.courseName}</h3>
                <div className="course-info">
                  <p>Instructor: {course.faculty.name}</p>
                  <p>Total Attendance: {attendanceCount} days</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance History */}
      <div className="live-attendance">
        <h3>Attendance History ({attendanceHistory.length} records)</h3>
        
        {attendanceHistory.length === 0 ? (
          <div className="message info">
            No attendance records yet. Start attending classes and scan QR codes to build your attendance history!
          </div>
        ) : (
          <div className="attendance-list">
            {attendanceHistory.slice().reverse().map((record, index) => (
              <div key={record._id} className="attendance-item">
                <div className="student-info">
                  <div className="student-name">{record.course.courseName}</div>
                  <div className="student-email">
                    {formatDate(record.sessionDate)} at {formatTime(record.timestamp)}
                  </div>
                </div>
                <div className="attendance-meta">
                  <div>✅ Present</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;