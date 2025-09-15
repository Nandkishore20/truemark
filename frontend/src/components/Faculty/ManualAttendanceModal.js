import React, { useState } from 'react';
import { markManualAttendance } from '../../services/api';

const ManualAttendanceModal = ({ course, onClose }) => {
    const [selectedStudent, setSelectedStudent] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!selectedStudent) {
            setError('Please select a student.');
            return;
        }
        
        setIsLoading(true);

        try {
            const attendanceData = {
                courseId: course._id,
                studentId: selectedStudent,
                sessionDate: new Date().toISOString(),
            };
            await markManualAttendance(attendanceData);
            const studentName = course.students.find(s => s._id === selectedStudent)?.name;
            setSuccess(`Attendance marked for ${studentName || 'the student'}.`);
            setSelectedStudent('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark attendance.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Manual Attendance for {course.name}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="studentSelect" className="form-label">Select Student</label>
                                <select
                                    id="studentSelect"
                                    className="form-select"
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choose a student --</option>
                                    {course.students.map(student => (
                                        <option key={student._id} value={student._id}>
                                            {student.name} ({student.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p><small>Attendance will be marked for today's date.</small></p>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Marking...' : 'Mark Present'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualAttendanceModal;