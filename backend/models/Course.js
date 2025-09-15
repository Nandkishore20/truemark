const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  classroomLocation: {
    lat: {
      type: Number,
      default: 26.9124 // Default to Jaipur coordinates
    },
    lon: {
      type: Number,
      default: 75.7873
    }
  },
  activeSession: {
    isActive: {
      type: Boolean,
      default: false
    },
    currentToken: String,
    tokenExpiry: Date,
    sessionDate: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);