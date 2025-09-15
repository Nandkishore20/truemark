import React, { useState } from 'react';
import { addStudentToCourse } from '../../services/api';

const AddStudentModal = ({ course, onClose, onStudentAdded }) => {
    const [studentEmail, setStudentEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!studentEmail) {
            setError('Please enter a student email.');
            setIsLoading(false);
            return;
        }

        try {
            await addStudentToCourse(course._id, studentEmail);
            setSuccess(`Successfully added ${studentEmail} to the course.`);
            setStudentEmail('');
            onStudentAdded(); // Refresh the course list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add student.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Add Student to {course.name}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && <div className="alert alert-danger">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="studentEmail" className="form-label">Student Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="studentEmail"
                                    value={studentEmail}
                                    onChange={(e) => setStudentEmail(e.target.value)}
                                    placeholder="student@example.com"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add Student'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddStudentModal;