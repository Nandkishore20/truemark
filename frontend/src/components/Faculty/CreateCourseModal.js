import React, { useState } from 'react';
import api from '../../services/api';

const CreateCourseModal = ({ onClose, onCourseCreated }) => {
  const [courseName, setCourseName] = useState('');
  const [classroomLat, setClassroomLat] = useState('');
  const [classroomLon, setClassroomLon] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/faculty/courses', {
        courseName,
        classroomLat,
        classroomLon,
      });
      onCourseCreated(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Create New Course</h2>
        {error && <div className="message error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Course Name</label>
            <input
              type="text"
              className="form-control"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Classroom Latitude</label>
            <input
              type="number"
              className="form-control"
              value={classroomLat}
              onChange={(e) => setClassroomLat(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Classroom Longitude</label>
            <input
              type="number"
              className="form-control"
              value={classroomLon}
              onChange={(e) => setClassroomLon(e.target.value)}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          width: 400px;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

export default CreateCourseModal;