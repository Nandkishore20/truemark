import React from 'react';

const LiveAttendanceList = ({ attendanceList }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDistance = (distance) => {
    return `${distance}m`;
  };

  return (
    <div className="live-attendance">
      <h3>Live Attendance ({attendanceList.length} students present)</h3>
      
      {attendanceList.length === 0 ? (
        <div className="message info">
          No students have marked attendance yet. Students will appear here in real-time as they scan the QR code.
        </div>
      ) : (
        <div className="attendance-list">
          {attendanceList.map((attendance, index) => (
            <div key={index} className="attendance-item">
              <div className="student-info">
                <div className="student-name">{attendance.studentName}</div>
                <div className="student-email">{attendance.studentEmail}</div>
              </div>
              <div className="attendance-meta">
                <div>{formatTime(attendance.timestamp)}</div>
                <div>{formatDistance(attendance.distance)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveAttendanceList;