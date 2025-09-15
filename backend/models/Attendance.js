const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionDate: {
    type: String,
    required: true
  },
  location: {
    lat: Number,
    lon: Number
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance for same session
attendanceSchema.index({ course: 1, student: 1, sessionDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);