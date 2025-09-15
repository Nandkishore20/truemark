import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import api from '../../services/api';
import socketService from '../../services/socket';
import LiveAttendanceList from './LiveAttendanceList';
import CreateCourseModal from './CreateCourseModal'; // Import the new component

const FacultyDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentToken, setCurrentToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for the modal

  useEffect(() => {
    fetchCourses();
    initializeSocket();

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, []);

  // Countdown timer for token expiry
  useEffect(() => {
    let interval;
    if (tokenExpiry) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const expiryTime = new Date(tokenExpiry).getTime();
        const timeLeft = Math.max(0, Math.ceil((expiryTime - now) / 1000));
        setCountdown(timeLeft);

        if (timeLeft === 0) {
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tokenExpiry]);

  const initializeSocket = () => {
    socketService.connect();

    socketService.onNewToken((data) => {
      setCurrentToken(data.token);
      setTokenExpiry(data.expiry);
    });

    socketService.onStudentPresent((data) => {
      setAttendanceList(prev => [...prev, data]);
    });

    socketService.onSessionEnded(() => {
      setActiveSession(null);
      setCurrentToken('');
      setTokenExpiry(null);
      setCountdown(0);
    });
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/faculty/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (courseId, courseName) => {
    try {
      setError('');
      const response = await api.post('/faculty/start-session', { courseId });

      setActiveSession({ courseId, courseName });
      setCurrentToken(response.data.token);
      setTokenExpiry(response.data.expiry);
      setAttendanceList([]);

      // Join socket room for this course
      socketService.joinFacultyRoom(courseId);

    } catch (error) {
      console.error('Error starting session:', error);
      setError(error.response?.data?.message || 'Failed to start session');
    }
  };

  const endSession = () => {
    setActiveSession(null);
    setCurrentToken('');
    setTokenExpiry(null);
    setCountdown(0);
    setAttendanceList([]);
  };

  const handleCourseCreated = (newCourse) => {
    setCourses([...courses, newCourse]);
    setIsModalOpen(false);
  };


  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Faculty Dashboard</h1>

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {!activeSession ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ color: 'white' }}>Select a Course to Start Attendance</h2>
            <button className="btn btn-success" onClick={() => setIsModalOpen(true)}>
              Create New Course
            </button>
          </div>
          <div className="courses-grid">
            {courses.map(course => (
              <div key={course._id} className="course-card">
                <h3 className="course-name">{course.courseName}</h3>
                <div className="course-info">
                  <p>Students Enrolled: {course.students.length}</p>
                  <p>Location: {course.classroomLocation.lat.toFixed(4)}, {course.classroomLocation.lon.toFixed(4)}</p>
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => startSession(course._id, course.courseName)}
                  >
                    Start Attendance Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="qr-section">
            <h3>Active Session: {activeSession.courseName}</h3>

            {currentToken && (
              <div>
                <div className="qr-code">
                  <QRCode
                    value={JSON.stringify({
                      token: currentToken,
                      courseId: activeSession.courseId,
                      timestamp: Date.now()
                    })}
                    size={256}
                    level="H"
                  />
                </div>

                <div className="session-info">
                  <p>Token expires in: <span className="countdown">{countdown}s</span></p>
                  <p>Students scan this QR code to mark attendance</p>
                  <button
                    className="btn btn-danger"
                    onClick={endSession}
                    style={{ marginTop: '1rem' }}
                  >
                    End Session
                  </button>
                </div>
              </div>
            )}
          </div>

          <LiveAttendanceList attendanceList={attendanceList} />
        </div>
      )}
      {isModalOpen && (
        <CreateCourseModal
          onClose={() => setIsModalOpen(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}
    </div>
  );
};

export default FacultyDashboard;