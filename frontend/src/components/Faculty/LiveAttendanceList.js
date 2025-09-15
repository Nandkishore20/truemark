import React, { useState, useEffect } from 'react';
import socketService from '../../services/socket';

const LiveAttendanceList = ({ courseId }) => {
    // Initialize with an empty array to prevent crash
    const [markedStudents, setMarkedStudents] = useState([]);

    useEffect(() => {
        const socket = socketService.getSocket();

        // Listen for updates from the server
        const handleUpdate = (studentList) => {
            setMarkedStudents(studentList);
        };
        socket.on('student-marked-update', handleUpdate);

        // Clean up the listener when the component is unmounted
        return () => {
            socket.off('student-marked-update', handleUpdate);
        };
    }, [courseId]); // Rerun effect if courseId changes

    return (
        <div>
            <h6>Live Attendance</h6>
            {/* Add a check to see if the array is empty */}
            {markedStudents.length > 0 ? (
                <ul className="list-group">
                    {markedStudents.map((student, index) => (
                        <li key={student._id || index} className="list-group-item d-flex justify-content-between align-items-center">
                            {student.name}
                            <span className="badge bg-primary rounded-pill">{student.email}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No students have marked attendance yet.</p>
            )}
            <p className="mt-2">
                <small>Total: {markedStudents.length}</small>
            </p>
        </div>
    );
};

export default LiveAttendanceList;