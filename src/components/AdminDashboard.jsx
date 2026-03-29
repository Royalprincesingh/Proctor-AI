import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examAPI, scheduleAPI, proctorAPI, authAPI, adminAPI, authHelpers } from '../services/api';

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [liveExams, setLiveExams] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalExams: 0,
    ongoingExams: 0,
    alertsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [selectedExamForMonitoring, setSelectedExamForMonitoring] = useState(null);
  const [examMonitoringData, setExamMonitoringData] = useState(null);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  // Live video streaming state
  const [selectedStudentForLiveView, setSelectedStudentForLiveView] = useState(null);
  const [liveCameraUrl, setLiveCameraUrl] = useState(null);
  const [liveScreenUrl, setLiveScreenUrl] = useState(null);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [showLiveMonitoring, setShowLiveMonitoring] = useState(false);

  // Live video streaming functions
  const startLiveMonitoring = (studentId, examId, studentName) => {
    console.log('Starting live monitoring for student:', studentId, studentName);
    setSelectedStudentForLiveView({ id: studentId, name: studentName, examId });
    setShowLiveMonitoring(true);

    // Start polling for live feeds and alerts
    startLiveFeedPolling(studentId);
  };

  const startLiveFeedPolling = (studentId) => {
    console.log('🎥 Starting live feed polling for student:', studentId);

    // Camera feed polling
    const cameraInterval = setInterval(async () => {
      try {
        const session = authHelpers.getCurrentSession();
        const token = session?.token;

        if (!token) {
          console.warn('No auth token for camera feed');
          return;
        }

        console.log('📹 Polling camera feed...');
        const response = await fetch(`http://localhost:5001/api/proctor/get-camera?studentId=${studentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Camera response status:', response.status);

        if (response.ok) {
          const blob = await response.blob();
          console.log('Camera blob size:', blob.size);

          if (blob.size > 0) {
            // Clean up previous URL
            if (liveCameraUrl) {
              URL.revokeObjectURL(liveCameraUrl);
            }

            const url = URL.createObjectURL(blob);
            setLiveCameraUrl(url);
            console.log('✅ Camera feed updated');
          } else {
            console.warn('Empty camera blob received');
          }
        } else {
          const errorText = await response.text();
          console.error('Camera feed error:', response.status, errorText);
        }
      } catch (error) {
        console.error('Camera feed fetch error:', error);
      }
    }, 1000); // 1 FPS for camera

    // Screen feed polling
    const screenInterval = setInterval(async () => {
      try {
        const session = authHelpers.getCurrentSession();
        const token = session?.token;

        if (!token) {
          console.warn('No auth token for screen feed');
          return;
        }

        console.log('🖥️ Polling screen feed...');
        const response = await fetch(`http://localhost:5001/api/proctor/get-screen?studentId=${studentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Screen response status:', response.status);

        if (response.ok) {
          const blob = await response.blob();
          console.log('Screen blob size:', blob.size);

          if (blob.size > 0) {
            // Clean up previous URL
            if (liveScreenUrl) {
              URL.revokeObjectURL(liveScreenUrl);
            }

            const url = URL.createObjectURL(blob);
            setLiveScreenUrl(url);
            console.log('✅ Screen feed updated');
          } else {
            console.warn('Empty screen blob received');
          }
        } else {
          const errorText = await response.text();
          console.error('Screen feed error:', response.status, errorText);
        }
      } catch (error) {
        console.error('Screen feed fetch error:', error);
      }
    }, 1200); // Slightly slower for screen

    // Live alerts polling
    const alertsInterval = setInterval(async () => {
      try {
        const session = authHelpers.getCurrentSession();
        const token = session?.token;

        if (!token) return;

        console.log('🚨 Polling alerts...');
        const response = await fetch(
          `http://localhost:5001/api/proctor/live-alerts?studentId=${studentId}&examId=${selectedStudentForLiveView?.examId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Alerts response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Alerts data:', data);
          if (data.success && data.alerts) {
            setLiveAlerts(data.alerts);
            console.log('✅ Alerts updated:', data.alerts.length);
          }
        } else {
          const errorText = await response.text();
          console.error('Alerts fetch error:', response.status, errorText);
        }
      } catch (error) {
        console.error('Live alerts fetch error:', error);
      }
    }, 3000); // 3 seconds for alerts

    // Store intervals for cleanup
    if (!window.liveMonitoringIntervals) {
      window.liveMonitoringIntervals = {};
    }
    window.liveMonitoringIntervals.camera = cameraInterval;
    window.liveMonitoringIntervals.screen = screenInterval;
    window.liveMonitoringIntervals.alerts = alertsInterval;

    console.log('🎯 Live feed polling started');
  };

  const stopLiveMonitoring = () => {
    // Clear all polling intervals
    if (window.liveMonitoringIntervals) {
      Object.values(window.liveMonitoringIntervals).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      window.liveMonitoringIntervals = {};
    }

    // Clean up URLs
    if (liveCameraUrl) {
      URL.revokeObjectURL(liveCameraUrl);
      setLiveCameraUrl(null);
    }
    if (liveScreenUrl) {
      URL.revokeObjectURL(liveScreenUrl);
      setLiveScreenUrl(null);
    }

    setLiveAlerts([]);
    setSelectedStudentForLiveView(null);
    setShowLiveMonitoring(false);
  };
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'users', label: 'Manage Users', icon: 'bi-people' },
    { id: 'exams', label: 'All Exams', icon: 'bi-journal-text' },
    { id: 'questions', label: 'Question Bank', icon: 'bi-question-circle' },
    { id: 'schedule', label: 'Schedule & Timetable', icon: 'bi-calendar-event' },
    { id: 'monitoring', label: 'Live Monitoring', icon: 'bi-eye', badge: dashboardStats.ongoingExams },
    { id: 'alerts', label: 'AI Alerts Logs', icon: 'bi-exclamation-triangle' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'bi-bar-chart' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear' }
  ];

  useEffect(() => {
    loadAdminDashboardData();
  }, []);

  const loadAdminDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check current session using auth helpers
      const session = authHelpers.getCurrentSession();
      if (!session || session.type !== 'admin') {
        console.warn('Unauthorized access to admin dashboard');
        navigate('/');
        return;
      }

      setUser(session.user);

      // Fetch data sequentially with delays to avoid rate limiting
      let statsData = { totalUsers: 0, totalExams: 0, ongoingExams: 0, alertsToday: 0 };
      let examData = [];
      let alertData = [];
      let userData = [];

      try {
        // Load stats first
        const statsResponse = await adminAPI.getStats();
        if (statsResponse.success && statsResponse.data) {
          statsData = {
            totalUsers: statsResponse.data.totalUsers || 0,
            totalExams: statsResponse.data.totalExams || 0,
            ongoingExams: statsResponse.data.ongoingExams || 0,
            alertsToday: statsResponse.data.alertsToday || 0
          };
        }
      } catch (err) {
        console.warn('Failed to load admin stats:', err.message);
        // Use fallback stats
      }

      // Small delay before next call
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        // Load exams
        const examResponse = await examAPI.getAllExams();
        if (examResponse.success && examResponse.data) {
          const exams = Array.isArray(examResponse.data) ? examResponse.data : [];
          examData = exams.slice(0, 4).map(exam => ({
            id: exam._id || exam.id,
            title: exam.title || exam.name || 'Untitled Exam',
            date: exam.scheduleDate ? new Date(exam.scheduleDate).toLocaleDateString() : 'No Date',
            duration: exam.duration ? `${exam.duration} minutes` : 'N/A',
            candidates: 0,
            status: getExamStatus(exam)
          }));
        }
      } catch (err) {
        console.warn('Failed to load exams:', err.message);
      }

      // Small delay before next call
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        // Load alerts
        const alertResponse = await proctorAPI.getExamAlerts('all');
        if (alertResponse.success && alertResponse.data) {
          const alerts = Array.isArray(alertResponse.data) ? alertResponse.data.slice(0, 4) : [];
          alertData = alerts.map(alert => ({
            id: alert._id || alert.id,
            type: (alert.type || 'unknown').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            candidate: alert.userId?.name || 'Unknown',
            exam: alert.examId?.title || 'Unknown Exam',
            timestamp: alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Unknown',
            severity: alert.severity ? alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1) : 'Low'
          }));
        }
      } catch (err) {
        console.warn('Failed to load alerts:', err.message);
      }

      // Small delay before next call
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        // Load users
        const usersResponse = await adminAPI.getUsers();
        if (usersResponse.success && usersResponse.data) {
          const users = Array.isArray(usersResponse.data) ? usersResponse.data : [];
          userData = users.map(user => ({
            id: user._id || user.id,
            name: user.name || 'Unknown',
            email: user.email || 'unknown@example.com',
            role: user.role || 'student',
            joinedDate: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown',
            status: 'Active'
          }));
        }
      } catch (err) {
        console.warn('Failed to load users:', err.message);
        // Provide fallback message instead of empty array
        setError('Unable to load user data. Some admin features may be limited.');
      }

      // Update state with loaded data
      setDashboardStats(statsData);
      setLiveExams(examData);
      setRecentAlerts(alertData);
      setUsers(userData);

    } catch (err) {
      console.error('Admin dashboard data loading error:', err);
      setError('Failed to load dashboard data');
      if (err.message?.includes('authorized') || err.message?.includes('forbidden')) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-danger';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Live': return 'bg-danger';
      case 'Ending Soon': return 'bg-warning';
      case 'Upcoming': return 'bg-primary';
      case 'Completed': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

  const getExamStatus = (exam) => {
    if (!exam.scheduleDate) return 'No Schedule';

    const now = new Date();
    const examStart = new Date(exam.scheduleDate);
    const examEnd = new Date(examStart.getTime() + (exam.duration || 60) * 60 * 1000);

    if (now < examStart) {
      return 'Upcoming';
    } else if (now >= examStart && now <= examEnd) {
      // Check if ending soon (last 5 minutes)
      const timeUntilEnd = examEnd - now;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilEnd <= fiveMinutes) {
        return 'Ending Soon';
      } else {
        return 'Live';
      }
    } else {
      return 'Completed';
    }
  };

  const handleAssignCandidates = () => {
    setShowAssignModal(true);
    // Load exams for dropdown if not already loaded
    if (exams.length === 0) {
      examAPI.getAllExams().then(response => {
        if (response.success) {
          setExams(response.data);
        }
      });
    }
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignSubmit = async () => {
    if (!selectedExam || selectedUsers.length === 0) {
      alert('Please select an exam and at least one user');
      return;
    }

    console.log('Sending payload:', { examId: selectedExam, userIds: selectedUsers });

    setAssigning(true);
    try {
      const response = await scheduleAPI.assignSchedule({
        examId: selectedExam,
        userIds: selectedUsers
      });

      if (response.success) {
        alert(response.message || 'Candidates assigned successfully!');
        setShowAssignModal(false);
        setSelectedExam('');
        setSelectedUsers([]);
        // Reload dashboard data to show updated stats
        loadAdminDashboardData();
      } else {
        alert('Failed to assign candidates: ' + response.message);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      alert('Failed to assign candidates. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const selectedExamName = exams.find(exam => exam._id === selectedExam)?.title || '';

  const handleLogout = () => {
    authHelpers.logout();
    navigate('/');
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        const response = await adminAPI.deleteUser(userId);
        if (response.success) {
          alert('User deleted successfully');
          // Reload users data
          loadAdminDashboardData();
        } else {
          alert('Failed to delete user: ' + response.message);
        }
      } catch (error) {
        console.error('Delete user error:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const handleDeleteExam = async (examId, examTitle) => {
    if (window.confirm(`Are you sure you want to delete exam "${examTitle}"? This will also delete all associated questions and schedules. This action cannot be undone.`)) {
      try {
        const response = await examAPI.deleteExam(examId);
        if (response.success) {
          alert('Exam and all associated data deleted successfully');
          // Reload exam data
          loadAdminDashboardData();
        } else {
          alert('Failed to delete exam: ' + response.message);
        }
      } catch (error) {
        console.error('Delete exam error:', error);
        alert('Failed to delete exam. Please try again.');
      }
    }
  };

  const handleMonitorExam = async (examId, examTitle) => {
    console.log('Opening monitoring view for exam:', examId, examTitle);

    try {
      // Set the selected exam
      setSelectedExamForMonitoring(examId);
      setShowMonitoringModal(true);

      // Load monitoring data for this exam with rate limiting to avoid 429 errors
      let examData = null;
      let alertsData = [];
      let scheduleData = [];

      try {
        // Sequential API calls with small delays to avoid rate limiting
        const examResponse = await examAPI.getExam(examId);
        if (examResponse.success) {
          examData = examResponse.data;
        }

        // Small delay before next call
        await new Promise(resolve => setTimeout(resolve, 200));

        const alertsResponse = await proctorAPI.getExamAlerts(examId);
        if (alertsResponse.success) {
          alertsData = alertsResponse.data;
        }

        // Small delay before next call
        await new Promise(resolve => setTimeout(resolve, 200));

        const scheduleResponse = await scheduleAPI.getExamSchedules(examId);
        if (scheduleResponse.success) {
          scheduleData = scheduleResponse.data;
        }
      } catch (error) {
        console.warn('Some API calls failed due to rate limiting, using fallback data:', error);
        // Continue with empty data - modal will still open with loading state
      }

      // Prepare student list with status and alerts
      const studentsWithStatus = Array.isArray(scheduleData) ? scheduleData.map(schedule => {
        const student = schedule.userId;
        const studentAlerts = Array.isArray(alertsData) ?
          alertsData.filter(alert => alert.studentId === student._id || alert.studentId === student.id) : [];

        // Calculate student status based on schedule
        let studentStatus = 'Not Started';
        const now = new Date();
        const examStart = new Date(examData?.scheduleDate);
        const examEnd = new Date(examStart.getTime() + (examData?.duration || 60) * 60 * 1000);

        if (schedule.status === 'completed') {
          studentStatus = 'Completed';
        } else if (schedule.status === 'active' || (now >= examStart && now <= examEnd)) {
          const timeUntilEnd = examEnd - now;
          const fiveMinutes = 5 * 60 * 1000;
          studentStatus = timeUntilEnd <= fiveMinutes ? 'Ending Soon' : 'Active';
        } else if (now < examStart) {
          studentStatus = 'Pending';
        }

        return {
          id: student._id,
          name: student.name || 'Unknown',
          email: student.email || '',
          status: studentStatus,
          alerts: studentAlerts,
          highPriorityAlerts: studentAlerts.filter(alert => alert.severity === 'high').length,
          totalAlerts: studentAlerts.length,
          schedule: schedule,
          lastActivity: studentAlerts.length > 0 ?
            Math.max(...studentAlerts.map(a => new Date(a.timestamp).getTime())) : null
        };
      }) : [];

      // Prepare monitoring data
      const monitoringData = {
        exam: examData,
        alerts: Array.isArray(alertsData) ? alertsData.slice(0, 10) : [], // Last 10 alerts
        students: studentsWithStatus,
        candidates: Array.isArray(scheduleData) ? scheduleData.map(schedule => schedule.userId).filter(Boolean) : [],
        activeCandidates: Array.isArray(scheduleData) ?
          scheduleData.filter(schedule => schedule.status === 'active').map(schedule => schedule.userId).filter(Boolean) : [],
        stats: {
          totalCandidates: scheduleData?.length || 0,
          activeCandidates: scheduleData?.filter(s => s.status === 'active').length || 0,
          totalAlerts: Array.isArray(alertsData) ? alertsData.length : 0,
          highSeverityAlerts: Array.isArray(alertsData) ?
            alertsData.filter(alert => alert.severity === 'high').length : 0
        }
      };

      setExamMonitoringData(monitoringData);
      console.log('Monitoring data loaded:', monitoringData);

    } catch (error) {
      console.error('Error loading monitoring data:', error);
      alert('Failed to load monitoring data. Please try again.');
      setShowMonitoringModal(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Navigation */}
      <nav className="navbar navbar-light bg-white shadow-sm sticky-top">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand fw-bold text-primary fs-4">
            ProctorAI
          </Link>

          {/* Search Bar */}
          <div className="d-flex flex-grow-1 justify-content-center" style={{maxWidth: '400px'}}>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Search users, exams, alerts..."
                aria-label="Search"
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </div>

          {/* Right Side Icons */}
          <div className="d-flex align-items-center">
            <button className="btn btn-outline-secondary me-3 position-relative">
              <i className="bi bi-bell fs-5"></i>
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                7
              </span>
            </button>

            <button className="btn btn-outline-secondary me-3">
              <i className="bi bi-gear fs-5"></i>
            </button>

            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2Yzc1N2QiLz4KPHRleHQgeD0iMTYiIHk9IjIwIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QUQ8L3RleHQ+Cjwvc3ZnPg==" alt="Admin" className="rounded-circle me-2" width="32" height="32" />
                <div className="text-start">
                  <div className="fw-semibold small">{user?.name || 'Admin'}</div>
                  <div className="small text-muted">Administrator</div>
                </div>
              </button>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="#"><i className="bi bi-person me-2"></i>Profile</a></li>
                <li><a className="dropdown-item" href="#"><i className="bi bi-gear me-2"></i>Settings</a></li>
                <li><hr className="dropdown-divider" /></li>
                <li><a className="dropdown-item text-danger" href="#" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout - No Sidebar */}
      <div className="container-fluid p-4">
        {/* Header with Action Buttons */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="h3 fw-bold text-dark mb-0">Admin Dashboard</h2>
            <p className="text-muted mb-0">Manage your ProctorAI system</p>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <button
              className="btn btn-outline-danger rounded-3 px-4 py-2"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
            <button
              className="btn btn-success rounded-3 px-4 py-2"
              onClick={handleAssignCandidates}
            >
              <i className="bi bi-person-plus me-2"></i>
              Assign Candidates
            </button>
            <Link to="/admin/create-exam" className="btn btn-primary rounded-3 px-4 py-2 text-decoration-none">
              <i className="bi bi-plus-circle me-2"></i>
              Create New Exam
            </Link>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="row g-4 mb-5">
          <div className="col-md-3">
            <div className="card shadow-sm rounded-3 border-0 h-100">
              <div className="card-body text-center">
                <div className="text-primary mb-3">
                  <i className="bi bi-people fs-1"></i>
                </div>
                <h4 className="card-title fw-bold text-primary mb-1">{dashboardStats.totalUsers.toLocaleString()}</h4>
                <p className="card-text text-muted small mb-0">Total Users</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm rounded-3 border-0 h-100">
              <div className="card-body text-center">
                <div className="text-warning mb-3">
                  <i className="bi bi-journal-text fs-1"></i>
                </div>
                <h4 className="card-title fw-bold text-warning mb-1">{dashboardStats.totalExams}</h4>
                <p className="card-text text-muted small mb-0">Total Exams</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm rounded-3 border-0 h-100">
              <div className="card-body text-center">
                <div className="text-success mb-3">
                  <i className="bi bi-play-circle fs-1"></i>
                </div>
                <h4 className="card-title fw-bold text-success mb-1">{dashboardStats.ongoingExams}</h4>
                <p className="card-text text-muted small mb-0">Ongoing Exams</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow-sm rounded-3 border-0 h-100">
              <div className="card-body text-center">
                <div className="text-danger mb-3">
                  <i className="bi bi-exclamation-triangle fs-1"></i>
                </div>
                <h4 className="card-title fw-bold text-danger mb-1">{dashboardStats.alertsToday}</h4>
                <p className="card-text text-muted small mb-0">AI Alerts Today</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Column - Main Tables */}
          <div className="col-lg-8">
            {/* Live Exams Table */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="bi bi-play-circle-fill me-2 text-success"></i>
                  Live & Upcoming Exams
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 fw-semibold ps-4">Exam Title</th>
                        <th className="border-0 fw-semibold">Date</th>
                        <th className="border-0 fw-semibold">Duration</th>
                        <th className="border-0 fw-semibold">Candidates</th>
                        <th className="border-0 fw-semibold">Status</th>
                        <th className="border-0 fw-semibold pe-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveExams.map((exam) => (
                        <tr key={exam.id}>
                          <td className="ps-4 fw-medium">{exam.title}</td>
                          <td>{exam.date}</td>
                          <td>{exam.duration}</td>
                          <td>{exam.candidates}</td>
                          <td>
                            <span className={`badge ${getStatusColor(exam.status)}`}>
                              {exam.status}
                            </span>
                          </td>
                          <td className="pe-4">
                            <button className="btn btn-sm btn-outline-primary me-1">
                              <i className="bi bi-eye me-1"></i>
                              View
                            </button>
                            <button
                              className="btn btn-sm btn-outline-success me-1"
                              onClick={() => handleMonitorExam(exam.id, exam.title)}
                            >
                              <i className="bi bi-display me-1"></i>
                              Monitor
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteExam(exam.id, exam.title)}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* User Management Table */}
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h5 className="card-title mb-0 fw-bold">
                  <i className="bi bi-people-fill me-2 text-primary"></i>
                  User Management
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 fw-semibold ps-4">Name</th>
                        <th className="border-0 fw-semibold">Email</th>
                        <th className="border-0 fw-semibold">Role</th>
                        <th className="border-0 fw-semibold">Joined Date</th>
                        <th className="border-0 fw-semibold">Status</th>
                        <th className="border-0 fw-semibold pe-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(users) && users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id}>
                            <td className="ps-4 fw-medium">{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`badge ${user.role === 'Admin' ? 'bg-primary' : 'bg-info'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{user.joinedDate}</td>
                            <td>
                              <span className={`badge ${user.status === 'Active' ? 'bg-success' : 'bg-danger'}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="pe-4">
                              <button className="btn btn-sm btn-outline-primary me-1">
                                <i className="bi bi-eye me-1"></i>
                                View
                              </button>
                              <button className="btn btn-sm btn-outline-secondary me-1">
                                <i className="bi bi-pencil me-1"></i>
                                Edit
                              </button>
                              <button className={`btn btn-sm me-1 ${user.status === 'Active' ? 'btn-outline-warning' : 'btn-outline-success'}`}>
                                <i className={`bi ${user.status === 'Active' ? 'bi-ban' : 'bi-check-circle'} me-1`}></i>
                                {user.status === 'Active' ? 'Block' : 'Unblock'}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                              >
                                <i className="bi bi-trash me-1"></i>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <i className="bi bi-people fs-2 mb-2 text-muted"></i>
                            <p className="text-muted mb-0">No users found</p>
                            <small className="text-muted">Users will appear here once loaded</small>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Widgets */}
          <div className="col-lg-4">
            {/* Recent AI Alerts */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h6 className="card-title mb-0 fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
                  Recent AI Alerts
                </h6>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="d-flex align-items-start p-3 border-bottom">
                      <div className="flex-shrink-0 me-3">
                        <span className={`badge ${getSeverityColor(alert.severity)} rounded-pill`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1 fw-medium small">{alert.type}</p>
                        <p className="mb-1 text-muted small">
                          <strong>{alert.candidate}</strong> - {alert.exam}
                        </p>
                        <small className="text-muted">{alert.timestamp}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Monitoring Widget */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h6 className="card-title mb-0 fw-bold">
                  <i className="bi bi-eye-fill me-2 text-danger"></i>
                  Live Monitoring Status
                </h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Active Monitoring Sessions</span>
                    <span className={`badge ${dashboardStats.ongoingExams > 0 ? 'bg-success' : 'bg-secondary'}`}>
                      {dashboardStats.ongoingExams}
                    </span>
                  </div>
                  <div className="progress" style={{height: '6px'}}>
                    <div
                      className={`progress-bar ${dashboardStats.ongoingExams > 0 ? 'bg-success' : 'bg-secondary'}`}
                      style={{width: `${Math.min(dashboardStats.ongoingExams * 25, 100)}%`}}
                    ></div>
                  </div>
                </div>

                {/* Real-time Monitoring Stats */}
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="text-success fw-bold fs-5">
                        <i className="bi bi-camera-video me-1"></i>
                        {dashboardStats.ongoingExams * 2}
                      </div>
                      <small className="text-muted">Face Detection</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="text-primary fw-bold fs-5">
                        <i className="bi bi-display me-1"></i>
                        {dashboardStats.ongoingExams * 2}
                      </div>
                      <small className="text-muted">Screen Monitor</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="text-warning fw-bold fs-5">
                        <i className="bi bi-mic me-1"></i>
                        {dashboardStats.ongoingExams * 2}
                      </div>
                      <small className="text-muted">Audio Monitor</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <div className="text-danger fw-bold fs-5">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        {dashboardStats.alertsToday}
                      </div>
                      <small className="text-muted">Active Alerts</small>
                    </div>
                  </div>
                </div>

                {/* Live Activity Feed */}
                <div>
                  <h6 className="text-primary mb-2">
                    <i className="bi bi-activity me-1"></i>
                    Live Activity
                  </h6>
                  <div className="bg-light rounded p-2" style={{height: '120px', overflowY: 'auto'}}>
                    <div className="small text-muted">
                      {dashboardStats.ongoingExams > 0 ? (
                        <>
                          <div className="mb-1">
                            <span className="text-success">●</span>
                            <small> Face detection active on {dashboardStats.ongoingExams} exam{dashboardStats.ongoingExams > 1 ? 's' : ''}</small>
                          </div>
                          <div className="mb-1">
                            <span className="text-primary">●</span>
                            <small> Screen monitoring running</small>
                          </div>
                          <div className="mb-1">
                            <span className="text-warning">●</span>
                            <small> Audio analysis in progress</small>
                          </div>
                          <div className="mb-1">
                            <span className="text-info">●</span>
                            <small> Real-time alert processing</small>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2">
                          <i className="bi bi-pause-circle text-muted fs-4 mb-1"></i>
                          <br />
                          <small>No active monitoring sessions</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Analytics Widget */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white">
                <h6 className="card-title mb-0 fw-bold">
                  <i className="bi bi-bar-chart-line me-2 text-primary"></i>
                  Exam Analytics
                </h6>
              </div>
              <div className="card-body text-center">
                <div className="mb-3">
                  <div className="bg-light rounded p-4" style={{height: '150px'}}>
                    <i className="bi bi-pie-chart text-muted fs-1"></i>
                    <p className="text-muted small mt-2">Exam Attendance Chart</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="bg-light rounded p-4" style={{height: '120px'}}>
                    <i className="bi bi-bar-chart text-muted fs-2"></i>
                    <p className="text-muted small mt-2">Performance Distribution</p>
                  </div>
                </div>
                <div>
                  <div className="bg-light rounded p-4" style={{height: '100px'}}>
                    <i className="bi bi-graph-up text-muted fs-3"></i>
                    <p className="text-muted small mt-2">Alert Frequency Trends</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="card-title fw-bold mb-3">
                  <i className="bi bi-speedometer2 me-2 text-info"></i>
                  Quick Stats
                </h6>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Active Sessions</span>
                  <span className="fw-semibold">12</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Total Questions</span>
                  <span className="fw-semibold">2,847</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted small">Avg. Completion</span>
                  <span className="fw-semibold">87%</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">System Uptime</span>
                  <span className="fw-semibold">99.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Candidates Modal */}
      {showAssignModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus me-2"></i>
                  Assign Candidates to Exam
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Exam Selection */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">Select Exam</label>
                  <select
                    className="form-select"
                    value={selectedExam}
                    onChange={(e) => setSelectedExam(e.target.value)}
                  >
                    <option value="">Choose an exam...</option>
                    {exams.map(exam => (
                      <option key={exam._id} value={exam._id}>
                        {exam.title} - {new Date(exam.scheduleDate).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Exam Info */}
                {selectedExam && (
                  <div className="alert alert-info mb-4">
                    <h6 className="alert-heading mb-2">
                      <i className="bi bi-info-circle me-2"></i>
                      Selected Exam: {selectedExamName}
                    </h6>
                    <p className="mb-0 small">
                      Selected {selectedUsers.length} candidate{selectedUsers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* User Selection */}
                <div>
                  <label className="form-label fw-semibold">Select Candidates</label>
                  <div className="border rounded p-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                    {users.map(user => (
                      <div key={user._id || user.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`user-${user._id || user.id}`}
                          checked={selectedUsers.includes(user._id || user.id)}
                          onChange={() => handleUserSelection(user._id || user.id)}
                        />
                        <label className="form-check-label w-100" htmlFor={`user-${user._id || user.id}`}>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{user.name}</strong>
                              <br />
                              <small className="text-muted">{user.email}</small>
                            </div>
                            <span className={`badge ${user.role === 'Admin' ? 'bg-primary' : 'bg-info'}`}>
                              {user.role}
                            </span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAssignSubmit}
                  disabled={!selectedExam || selectedUsers.length === 0 || assigning}
                >
                  {assigning ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Assign {selectedUsers.length} Candidate{selectedUsers.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exam Monitoring Modal */}
      {showMonitoringModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.7)'}} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-display me-2"></i>
                  Live Monitoring: {examMonitoringData?.exam?.title || 'Loading...'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowMonitoringModal(false)}
                ></button>
              </div>
              <div className="modal-body p-0">
                {examMonitoringData ? (
                  <div className="row g-0">
                    {/* Left Panel - Exam Stats & Student List */}
                    <div className="col-md-5 border-end">
                      <div className="p-4">
                        {/* Exam Statistics */}
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-graph-up me-2 text-primary"></i>
                          Exam Overview
                        </h6>

                        <div className="row g-2 mb-4">
                          <div className="col-6">
                            <div className="text-center p-3 bg-light rounded">
                              <div className="text-primary fw-bold fs-4">{examMonitoringData.stats.totalCandidates}</div>
                              <small className="text-muted">Total Students</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="text-center p-3 bg-success rounded">
                              <div className="text-white fw-bold fs-4">{examMonitoringData.stats.activeCandidates}</div>
                              <small className="text-white">Active Now</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="text-center p-3 bg-warning rounded">
                              <div className="text-dark fw-bold fs-4">{examMonitoringData.stats.totalAlerts}</div>
                              <small className="text-dark">Total Alerts</small>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="text-center p-3 bg-danger rounded">
                              <div className="text-white fw-bold fs-4">{examMonitoringData.stats.highSeverityAlerts}</div>
                              <small className="text-white">High Priority</small>
                            </div>
                          </div>
                        </div>

                        {/* Student List */}
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-people me-2 text-success"></i>
                          Students ({examMonitoringData.students?.length || 0})
                        </h6>
                        <div className="bg-light rounded p-2" style={{maxHeight: '400px', overflowY: 'auto'}}>
                          {examMonitoringData.students && examMonitoringData.students.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {examMonitoringData.students.map((student, index) => (
                                <div key={student.id} className="list-group-item px-3 py-3 border-bottom">
                                  <div className="d-flex align-items-start">
                                    <div className="flex-shrink-0 me-3">
                                      <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                                        student.status === 'Active' ? 'bg-success' :
                                        student.status === 'Ending Soon' ? 'bg-warning' :
                                        student.status === 'Completed' ? 'bg-secondary' : 'bg-primary'
                                      }`} style={{width: '40px', height: '40px'}}>
                                        <i className="bi bi-person text-white"></i>
                                      </div>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="d-flex justify-content-between align-items-start mb-1">
                                        <div>
                                          <h6 className="mb-0 fw-semibold">{student.name}</h6>
                                          <small className="text-muted">{student.email}</small>
                                        </div>
                                        <span className={`badge ${
                                          student.status === 'Active' ? 'bg-success' :
                                          student.status === 'Ending Soon' ? 'bg-warning text-dark' :
                                          student.status === 'Completed' ? 'bg-secondary' : 'bg-primary'
                                        }`}>
                                          {student.status}
                                        </span>
                                      </div>
                                      <div className="d-flex justify-content-between align-items-center mt-2">
                                        <div className="d-flex gap-2">
                                          <small className="text-muted">
                                            <i className="bi bi-exclamation-triangle me-1"></i>
                                            {student.totalAlerts} alerts
                                          </small>
                                          {student.highPriorityAlerts > 0 && (
                                            <small className="text-danger fw-semibold">
                                              <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                              {student.highPriorityAlerts} high
                                            </small>
                                          )}
                                        </div>
                                        <button
                                          className="btn btn-sm btn-outline-primary"
                                          onClick={() => startLiveMonitoring(student.id, selectedExamForMonitoring, student.name)}
                                          disabled={student.status === 'Not Started' || student.status === 'Completed'}
                                        >
                                          <i className="bi bi-eye me-1"></i>
                                          Monitor
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <i className="bi bi-people fs-2 mb-2 text-muted"></i>
                              <p className="text-muted mb-0">No students assigned</p>
                              <small className="text-muted">Students will appear here when assigned to this exam</small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel - Live Alerts & Activity */}
                    <div className="col-md-7">
                      <div className="p-4">
                        <h6 className="fw-bold mb-3">
                          <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                          Live Alerts & Activity
                        </h6>

                        <div className="bg-light rounded p-3" style={{height: '500px', overflowY: 'auto'}}>
                          {examMonitoringData.alerts.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {examMonitoringData.alerts.map((alert, index) => (
                                <div key={index} className="list-group-item px-3 py-3 border-bottom">
                                  <div className="d-flex align-items-start">
                                    <div className="flex-shrink-0 me-3">
                                      <span className={`badge ${getSeverityColor(alert.severity)} rounded-pill px-2 py-1`}>
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="d-flex justify-content-between align-items-start mb-1">
                                        <h6 className="mb-1 fw-semibold">
                                          {(alert.type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </h6>
                                        <small className="text-muted">
                                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Unknown'}
                                        </small>
                                      </div>
                                      <p className="mb-2 text-muted small">
                                        <strong>{alert.userId?.name || 'Unknown Student'}</strong>
                                        {alert.message && ` - ${alert.message}`}
                                      </p>
                                      <div className="d-flex gap-2">
                                        <span className="badge bg-info">Face Detection</span>
                                        <span className="badge bg-secondary">Auto-monitored</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-5">
                              <i className="bi bi-shield-check fs-1 text-success mb-3"></i>
                              <h6 className="text-muted mb-2">All Clear!</h6>
                              <p className="text-muted small mb-0">No alerts detected for this exam</p>
                              <div className="mt-3">
                                <span className="badge bg-success">Face Detection: Active</span>
                                <span className="badge bg-success ms-2">Screen Monitoring: Active</span>
                                <span className="badge bg-success ms-2">Audio Monitoring: Active</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h6>Loading monitoring data...</h6>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMonitoringModal(false)}
                >
                  Close Monitoring
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => {
                    // Refresh monitoring data
                    if (selectedExamForMonitoring) {
                      handleMonitorExam(selectedExamForMonitoring, examMonitoringData?.exam?.title || 'Exam');
                    }
                  }}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Video Monitoring Modal */}
      {showLiveMonitoring && selectedStudentForLiveView && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.95)'}} tabIndex="-1">
          <div className="modal-dialog modal-xl modal-fullscreen">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header bg-primary text-white border-0">
                <h4 className="modal-title fw-bold">
                  <i className="bi bi-eye me-2"></i>
                  Live Proctoring: {selectedStudentForLiveView.name}
                </h4>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={stopLiveMonitoring}
                ></button>
              </div>
              <div className="modal-body p-0">
                <div className="row g-0 h-100">
                  {/* Left Panel - Video Feeds */}
                  <div className="col-md-8">
                    <div className="row g-0 h-100">
                      {/* Camera Feed */}
                      <div className="col-md-6 border-end">
                        <div className="p-3 h-100 d-flex flex-column">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="text-white mb-0 fw-bold">
                              <i className="bi bi-camera-video me-2 text-success"></i>
                              Camera Feed
                            </h6>
                            <div className="d-flex align-items-center">
                              <span className="badge bg-success me-2">
                                <i className="bi bi-record-circle-fill me-1"></i>
                                Live
                              </span>
                              <small className="text-muted">1 FPS</small>
                            </div>
                          </div>

                          <div className="flex-grow-1 bg-secondary rounded d-flex align-items-center justify-content-center position-relative overflow-hidden">
                            {liveCameraUrl ? (
                              <img
                                src={liveCameraUrl}
                                alt="Student Camera"
                                className="w-100 h-100 object-fit-cover rounded"
                                style={{maxHeight: '100%', maxWidth: '100%'}}
                              />
                            ) : (
                              <div className="text-center text-muted">
                                <i className="bi bi-camera-video-off fs-1 mb-2"></i>
                                <p className="mb-0">Waiting for camera feed...</p>
                                <small>Student may not have camera enabled</small>
                              </div>
                            )}

                            {/* Camera Status Overlay */}
                            <div className="position-absolute top-0 end-0 p-2">
                              <span className={`badge ${liveCameraUrl ? 'bg-success' : 'bg-warning'}`}>
                                {liveCameraUrl ? 'Connected' : 'Waiting'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Screen Feed */}
                      <div className="col-md-6">
                        <div className="p-3 h-100 d-flex flex-column">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="text-white mb-0 fw-bold">
                              <i className="bi bi-display me-2 text-primary"></i>
                              Screen Feed
                            </h6>
                            <div className="d-flex align-items-center">
                              <span className="badge bg-success me-2">
                                <i className="bi bi-record-circle-fill me-1"></i>
                                Live
                              </span>
                              <small className="text-muted">0.8 FPS</small>
                            </div>
                          </div>

                          <div className="flex-grow-1 bg-secondary rounded d-flex align-items-center justify-content-center position-relative overflow-hidden">
                            {liveScreenUrl ? (
                              <img
                                src={liveScreenUrl}
                                alt="Student Screen"
                                className="w-100 h-100 object-fit-contain rounded"
                                style={{maxHeight: '100%', maxWidth: '100%'}}
                              />
                            ) : (
                              <div className="text-center text-muted">
                                <i className="bi bi-display fs-1 mb-2"></i>
                                <p className="mb-0">Waiting for screen feed...</p>
                                <small>Student may not have screen sharing enabled</small>
                              </div>
                            )}

                            {/* Screen Status Overlay */}
                            <div className="position-absolute top-0 end-0 p-2">
                              <span className={`badge ${liveScreenUrl ? 'bg-success' : 'bg-warning'}`}>
                                {liveScreenUrl ? 'Connected' : 'Waiting'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Live Alerts & Controls */}
                  <div className="col-md-4 border-start">
                    <div className="p-3 h-100 d-flex flex-column">
                      {/* Header */}
                      <div className="mb-3">
                        <h6 className="text-white fw-bold mb-3">
                          <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                          Live Monitoring Dashboard
                        </h6>

                        {/* Student Info */}
                        <div className="bg-primary bg-opacity-25 rounded p-3 mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
                              <i className="bi bi-person text-white"></i>
                            </div>
                            <div>
                              <h6 className="text-white mb-0 fw-bold">{selectedStudentForLiveView.name}</h6>
                              <small className="text-white-50">Student ID: {selectedStudentForLiveView.id.slice(-6)}</small>
                            </div>
                          </div>
                          <div className="row g-2">
                            <div className="col-6">
                              <div className="text-center bg-success bg-opacity-25 rounded py-2">
                                <i className="bi bi-camera-video text-success"></i>
                                <small className="d-block text-white">Face Detection</small>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="text-center bg-primary bg-opacity-25 rounded py-2">
                                <i className="bi bi-display text-primary"></i>
                                <small className="d-block text-white">Screen Monitor</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Alerts */}
                      <div className="flex-grow-1 mb-3">
                        <h6 className="text-white fw-bold mb-3">
                          <i className="bi bi-bell me-2 text-danger"></i>
                          Real-time Alerts
                        </h6>

                        <div className="bg-dark rounded p-3" style={{height: '400px', overflowY: 'auto'}}>
                          {liveAlerts.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {liveAlerts.map((alert, index) => (
                                <div key={index} className="list-group-item bg-transparent border-secondary text-white px-3 py-2 mb-2 rounded">
                                  <div className="d-flex align-items-start">
                                    <div className="flex-shrink-0 me-2">
                                      <span className={`badge ${
                                        alert.severity === 'high' ? 'bg-danger' :
                                        alert.severity === 'medium' ? 'bg-warning' : 'bg-info'
                                      } rounded-pill`}>
                                        {alert.severity}
                                      </span>
                                    </div>
                                    <div className="flex-grow-1">
                                      <div className="d-flex justify-content-between align-items-start mb-1">
                                        <small className="fw-bold text-white">
                                          {(alert.type || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </small>
                                        <small className="text-muted">
                                          {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : ''}
                                        </small>
                                      </div>
                                      <p className="mb-0 text-white small">{alert.message}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-5">
                              <i className="bi bi-shield-check fs-1 text-success mb-3"></i>
                              <h6 className="text-white mb-2">All Clear!</h6>
                              <p className="text-white-50 small mb-0">No violations detected</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Control Panel */}
                      <div className="mt-auto">
                        <h6 className="text-white fw-bold mb-3">
                          <i className="bi bi-gear me-2 text-info"></i>
                          Monitoring Controls
                        </h6>

                        <div className="row g-2">
                          <div className="col-6">
                            <button className="btn btn-outline-success btn-sm w-100">
                              <i className="bi bi-play-circle me-1"></i>
                              Resume
                            </button>
                          </div>
                          <div className="col-6">
                            <button className="btn btn-outline-warning btn-sm w-100">
                              <i className="bi bi-pause-circle me-1"></i>
                              Pause
                            </button>
                          </div>
                          <div className="col-6">
                            <button className="btn btn-outline-info btn-sm w-100">
                              <i className="bi bi-chat-dots me-1"></i>
                              Message
                            </button>
                          </div>
                          <div className="col-6">
                            <button className="btn btn-outline-danger btn-sm w-100">
                              <i className="bi bi-flag me-1"></i>
                              Flag
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-top border-secondary">
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">Monitoring Status</small>
                            <span className="badge bg-success">
                              <i className="bi bi-circle-fill text-success me-1"></i>
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-dark border-0">
                <div className="d-flex justify-content-between w-100 align-items-center">
                  <div className="text-muted small">
                    <i className="bi bi-info-circle me-1"></i>
                    Live proctoring session - All activities are monitored and recorded
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-light me-2"
                      onClick={() => {
                        // Refresh feeds
                        if (window.liveMonitoringIntervals) {
                          // Clear and restart polling
                          Object.values(window.liveMonitoringIntervals).forEach(interval => {
                            if (interval) clearInterval(interval);
                          });
                          startLiveFeedPolling(selectedStudentForLiveView.id);
                        }
                      }}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Refresh
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={stopLiveMonitoring}
                    >
                      <i className="bi bi-stop-circle me-1"></i>
                      End Monitoring
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-top mt-5 py-4">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6">
              <p className="text-muted mb-0">&copy; 2025 ProctorAI. All rights reserved.</p>
            </div>
            <div className="col-md-6 text-md-end">
              <a href="#" className="text-decoration-none text-muted me-3">Terms</a>
              <a href="#" className="text-decoration-none text-muted me-3">Privacy</a>
              <a href="#" className="text-decoration-none text-muted">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
