import React, { useState, useEffect, useMemo } from 'react';
import { getFacultyCourses, startAttendanceSession } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CreateCourseModal from './CreateCourseModal';
import AddStudentModal from './AddStudentModal';
import ManualAttendanceModal from './ManualAttendanceModal';
import LiveAttendanceList from './LiveAttendanceList';
import QRCode from 'qrcode.react';
import socketService from '../../services/socket';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isAddStudentModalOpen, setAddStudentModalOpen] = useState(false);
    const [isManualAttendanceModalOpen, setManualAttendanceModalOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [activeSession, setActiveSession] = useState(null);
    const [currentToken, setCurrentToken] = useState('');
    // const [tokenExpiry, setTokenExpiry] = useState(''); // <-- REMOVED

    const fetchCourses = async () => {
        try {
            const res = await getFacultyCourses();
            setCourses(res.data);
        } catch (err) {
            setError('Failed to fetch courses.');
            console.error(err);
        }
    };

    useEffect(() => {
        fetchCourses();
        const socket = socketService.getSocket();

        socket.on('new-token', ({ token, expiry }) => {
            setCurrentToken(token);
            // setTokenExpiry(expiry); // <-- REMOVED
        });

        socket.on('session-ended', () => {
            setActiveSession(null);
            setCurrentToken('');
            alert('Attendance session has ended.');
        });
        
        return () => {
            socket.off('new-token');
            socket.off('session-ended');
        };
    }, []);

    const handleStartSession = async (courseId) => {
        try {
            const res = await startAttendanceSession(courseId);
            setActiveSession({ courseId });
            setCurrentToken(res.data.token);
            // setTokenExpiry(res.data.expiry); // <-- REMOVED
            socketService.getSocket().emit('join_course_room', courseId);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start session.');
        }
    };

    const openAddStudentModal = (course) => {
        setSelectedCourse(course);
        setAddStudentModalOpen(true);
    };

    const openManualAttendanceModal = (course) => {
        setSelectedCourse(course);
        setManualAttendanceModalOpen(true);
    };
    
    const qrCodeValue = useMemo(() => {
        if (!currentToken || !activeSession?.courseId) return '';
        return JSON.stringify({
            token: currentToken,
            courseId: activeSession.courseId,
            timestamp: Date.now()
        });
    }, [currentToken, activeSession]);


    return (
        <div className="container mt-4">
            <h2>Faculty Dashboard</h2>
            <p>Welcome, {user?.name}</p>
            {error && <div className="alert alert-danger">{error}</div>}
            
            <button className="btn btn-primary mb-3" onClick={() => setCreateModalOpen(true)}>
                Create New Course
            </button>

            {activeSession && (
                <div className="card mb-4">
                    <div className="card-header">Live Attendance Session</div>
                    <div className="card-body text-center">
                        <p>Scan the QR code to mark your attendance.</p>
                        {qrCodeValue && <QRCode value={qrCodeValue} size={256} level="H" />}
                        <p className="mt-3">
                            <small>This QR code is valid for 10 seconds.</small>
                        </p>
                    </div>
                    <div className="card-footer">
                        <LiveAttendanceList courseId={activeSession.courseId} />
                    </div>
                </div>
            )}

            <h3>Your Courses</h3>
            <div className="row">
                {courses.length > 0 ? (
                    courses.map(course => (
                        <div key={course._id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">{course.name}</h5>
                                    <h6 className="card-subtitle mb-2 text-muted">{course.code}</h6>
                                    <p className="card-text">{course.students.length} student(s) enrolled.</p>
                                    <button
                                        className="btn btn-success me-2"
                                        onClick={() => handleStartSession(course._id)}
                                        disabled={!!activeSession}
                                    >
                                        Start Attendance
                                    </button>
                                    <button
                                        className="btn btn-info me-2"
                                        onClick={() => openAddStudentModal(course)}
                                    >
                                        Add Student
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => openManualAttendanceModal(course)}
                                    >
                                        Manual Attendance
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>You have not created any courses yet.</p>
                )}
            </div>

            {isCreateModalOpen && (
                <CreateCourseModal
                    onClose={() => setCreateModalOpen(false)}
                    onCourseCreated={fetchCourses}
                />
            )}
            
            {isAddStudentModalOpen && selectedCourse && (
                <AddStudentModal
                    course={selectedCourse}
                    onClose={() => setAddStudentModalOpen(false)}
                    onStudentAdded={fetchCourses}
                />
            )}

            {isManualAttendanceModalOpen && selectedCourse && (
                <ManualAttendanceModal
                    course={selectedCourse}
                    onClose={() => setManualAttendanceModalOpen(false)}
                />
            )}
        </div>
    );
};

export default FacultyDashboard;