import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

// Helper function to get token from localStorage (checks both user and admin tokens)
const getToken = () => {
  // Check new keys first (separate storage)
  const userToken = localStorage.getItem('userToken');
  const adminToken = localStorage.getItem('adminToken');

  // Check old keys as fallback (backward compatibility)
  const oldToken = localStorage.getItem('token');

  // Priority: adminToken > userToken > oldToken (backward compatibility)
  return adminToken || userToken || oldToken;
};

// Helper function to create headers with auth
const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
});

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getHeaders(),
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  getProfile: () => apiCall('/auth/me'),
};

// Exam API
export const examAPI = {
  createExam: (examData) => apiCall('/exams/create', {
    method: 'POST',
    body: JSON.stringify(examData),
  }),

  getAllExams: () => apiCall('/exams/all'),

  getUserExams: (userId) => apiCall(`/exams/user/${userId}`),

  getExam: (examId) => apiCall(`/exams/${examId}`),

  updateExam: (examId, examData) => apiCall(`/exams/update/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(examData),
  }),

  deleteExam: (examId) => apiCall(`/exams/delete/${examId}`, {
    method: 'DELETE',
  }),
};

// Schedule API
export const scheduleAPI = {
  assignExam: (scheduleData) => apiCall('/schedule/assign', {
    method: 'POST',
    body: JSON.stringify(scheduleData),
  }),

  assignSchedule: (payload) => apiCall('/schedule/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  getUserSchedules: (userId) => apiCall(`/schedule/user/${userId}`),

  getExamSchedules: (examId) => apiCall(`/schedule/exam/${examId}`),

  updateScheduleStatus: (scheduleId, status) => apiCall(`/schedule/update/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
};

// Proctoring API
export const proctorAPI = {
  photoMatch: (photoData) => apiCall('/proctor/photo-match', {
    method: 'POST',
    body: JSON.stringify(photoData),
  }),

  logEvent: (eventData) => apiCall('/proctor/log-event', {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),

  getExamAlerts: (examId) => apiCall(`/proctor/events/${examId}`),

  getPhotoLogs: (examId, userId) => apiCall(`/proctor/photo-logs/${examId}/${userId}`),
};

// Admin API
export const adminAPI = {
  getUsers: () => apiCall('/admin/users'),
  updateUser: (userId, userData) => apiCall(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  deleteUser: (userId) => apiCall(`/admin/users/${userId}`, {
    method: 'DELETE',
  }),
  blockUser: (userId) => apiCall(`/admin/users/${userId}/block`, {
    method: 'PUT',
  }),
  getStats: () => apiCall('/admin/stats'),
};

// Question API
export const questionAPI = {
  getQuestionsByExam: (examId) => apiCall(`/questions/exam/${examId}`),
  addQuestion: (questionData) => apiCall('/questions/add', {
    method: 'POST',
    body: JSON.stringify(questionData),
  }),
  updateQuestion: (questionId, questionData) => apiCall(`/questions/update/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(questionData),
  }),
  deleteQuestion: (questionId) => apiCall(`/questions/delete/${questionId}`, {
    method: 'DELETE',
  }),
};

// Alert Management API
export const alertAPI = {
  deleteAlert: (alertId) => apiCall(`/proctor/events/${alertId}`, {
    method: 'DELETE',
  }),
};

// Authentication helpers
export const authHelpers = {
  // Login functions that store tokens separately
  loginUser: (token, userData) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('userData', JSON.stringify(userData));
    // Clear admin session if switching from admin to user
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
  },

  loginAdmin: (token, userData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminData', JSON.stringify(userData));
    // Clear user session if switching from user to admin
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  },

  // Get current session info
  getCurrentSession: () => {
    const userToken = localStorage.getItem('userToken');
    const adminToken = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('userData');
    const adminData = localStorage.getItem('adminData');

    if (adminToken && adminData) {
      try {
        return {
          token: adminToken,
          user: JSON.parse(adminData),
          type: 'admin'
        };
      } catch (e) {
        return null;
      }
    } else if (userToken && userData) {
      try {
        return {
          token: userToken,
          user: JSON.parse(userData),
          type: 'user'
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  // Logout functions
  logoutUser: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  },

  logoutAdmin: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
  },

  // Universal logout - detects and clears current session
  logout: () => {
    const session = authHelpers.getCurrentSession();
    if (session?.type === 'admin') {
      authHelpers.logoutAdmin();
    } else {
      authHelpers.logoutUser();
    }
  },

  // Check if user is logged in (either as user or admin)
  isAuthenticated: () => {
    return !!(localStorage.getItem('userToken') || localStorage.getItem('adminToken'));
  }
};

// Enhanced Auth API with separate login methods
export const enhancedAuthAPI = {
  ...authAPI,

  // Separate login methods for user and admin (use existing response)
  loginAsUser: (response) => {
    if (response.success && response.user.role !== 'admin') {
      authHelpers.loginUser(response.token, response.user);
    }
    return response;
  },

  loginAsAdmin: (response) => {
    if (response.success && response.user.role === 'admin') {
      authHelpers.loginAdmin(response.token, response.user);
    }
    return response;
  }
};

// Health check
export const healthAPI = {
  check: () => apiCall('/health'),
};

export default {
  auth: authAPI,
  enhancedAuth: enhancedAuthAPI,
  authHelpers,
  exam: examAPI,
  schedule: scheduleAPI,
  proctor: proctorAPI,
  admin: adminAPI,
  question: questionAPI,
  alert: alertAPI,
  health: healthAPI,
};
