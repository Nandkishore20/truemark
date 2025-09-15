import axios from 'axios';

// This line reads the .env file.
// If it can't find the variable, it defaults to the localhost URL.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL, // This sets the base for all requests, e.g., "http://192.168.1.6:5000/api"
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth routes will be appended to the baseURL
// e.g., POST /auth/login
export const loginUser = (userData) => api.post('/auth/login', userData);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const getUser = () => api.get('/auth/user');

// Faculty routes
export const createCourse = (courseData) => api.post('/faculty/courses', courseData);
export const getFacultyCourses = () => api.get('/faculty/courses');
export const startAttendanceSession = (courseId) => api.post(`/faculty/courses/${courseId}/start-session`);
export const addStudentToCourse = (courseId, studentEmail) => api.post(`/faculty/courses/${courseId}/students`, { studentEmail });
export const markManualAttendance = (attendanceData) => api.post('/faculty/attendance/manual', attendanceData);

// Student routes
export const getStudentCourses = () => api.get('/student/courses');
export const markAttendance = (attendanceData) => api.post('/student/attendance', attendanceData);
export const getStudentAttendance = (courseId) => api.get(`/student/courses/${courseId}/attendance`);

export default api;