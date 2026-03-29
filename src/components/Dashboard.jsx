import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { examAPI, scheduleAPI, proctorAPI, questionAPI, authHelpers } from '../services/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalExams: 0,
    upcomingExams: 0,
    pendingResults: 0,
    proctoringScore: 95
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check for valid session using auth helpers
    const session = authHelpers.getCurrentSession();
    if (!session || !session.user) {
      setError('Session expired or invalid. Please login again.');
      setLoading(false);
      setTimeout(() => navigate('/'), 1200);
      return;
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get user data from session
      const session = authHelpers.getCurrentSession();
      if (!session || !session.user) {
        setError('User session not found. Please login again.');
        setLoading(false);
        setTimeout(() => navigate('/'), 1200);
        return;
      }

      const userData = session.user;
      const userId = userData.id || userData._id;
      if (!userId) {
        setError('User session not found. Please login again.');
        setLoading(false);
        setTimeout(() => navigate('/'), 1200);
        return;
      }
      setUser(userData);

      // Fetch user's exams and schedules
      const [examResponse, scheduleResponse] = await Promise.all([
        examAPI.getUserExams(userId).catch(e => ({ success: false, data: [] })),
        scheduleAPI.getUserSchedules(userId).catch(e => ({ success: false, data: [] }))
      ]);

      if (examResponse?.success && scheduleResponse?.success) {
        // Process upcoming exams
        const schedules = scheduleResponse.data || [];
        const now = new Date();
        const processedExams = schedules.map(schedule => {
          const startTime = new Date(schedule.startTime);
          const endTime = new Date(schedule.endTime);
          const canStart = schedule.status === 'pending' && startTime <= now && endTime > now;

          return {
            ...schedule.examId,
            scheduleId: schedule._id,
            scheduleStatus: schedule.status,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            canStart: canStart,
            status: schedule.status === 'appeared' ? 'Live' : 'Upcoming',
            timeStatus: startTime > now ? 'future' : endTime < now ? 'expired' : 'active'
          };
        });

        setUpcomingExams(processedExams);

        // Process completed exams
        const finishedSchedules = schedules.filter(s => s.status === 'finished');
        const processedCompletedExams = finishedSchedules.map(schedule => ({
          ...schedule.examId,
          scheduleId: schedule._id,
          score: schedule.score || 0,
          submittedAt: schedule.submittedAt,
          answers: schedule.answers || []
        }));
        setCompletedExams(processedCompletedExams);

        // Calculate dashboard stats
        const totalExams = finishedSchedules.length;
        const upcomingCount = schedules.filter(s => s.status === 'pending').length;
        const pendingResults = schedules.filter(s => s.status === 'appeared').length;

        setDashboardStats({
          totalExams,
          upcomingExams: upcomingCount,
          pendingResults,
          proctoringScore: 95
        });
      } else {
        setError('Failed to load your exam data. Please try again later.');
        setUpcomingExams([]);
        setDashboardStats({
          totalExams: 0,
          upcomingExams: 0,
          pendingResults: 0,
          proctoringScore: 95
        });
      }

      // Load recent activities (mock data for now - would come from alerts API)
      setRecentActivities([
        { message: 'Your identity was verified', time: '1 day ago', icon: 'bi-shield-check', color: 'text-info' },
        { message: 'Exam scheduled: Web Development', time: '3 days ago', icon: 'bi-calendar-plus', color: 'text-primary' }
      ]);

    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError('Failed to load dashboard data. Please login again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Start Exam
  const handleStartExam = async (exam) => {
    console.log('Starting exam:', exam);
    console.log('Exam ID:', exam._id || exam.id);
    console.log('Exam title:', exam.title);

    try {
      const examId = exam._id || exam.id;
      if (!examId) {
        alert('Exam ID not found. Please contact administrator.');
        return;
      }

      // Navigate to exam page
      navigate(`/exam/${examId}`);
    } catch (error) {
      console.error('Start exam error:', error);
      alert('Failed to start exam. Please try again.');
    }
  };

  const startMonitoringSystem = async (exam) => {
    try {
      // Get the correct token from session
      const session = authHelpers.getCurrentSession();
      const token = session?.token;

      if (!token) {
        console.warn('No token found for monitoring system');
        return;
      }

      // Send request to start Python monitoring
      const response = await fetch('http://localhost:5001/api/proctor/start-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: user._id,
          examId: exam._id,
          examName: exam.name
        })
      });

      if (response.ok) {
        console.log('Monitoring system started successfully');
      } else {
        console.warn('Failed to start monitoring system');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
    }
  };

  // Handle View Results
  const handleViewResults = async (exam) => {
    try {
      console.log('Viewing results for exam:', exam);

      // Get questions for this exam to show detailed results
      const questionResponse = await questionAPI.getQuestionsByExam(exam._id);

      if (!questionResponse.success) {
        alert('Failed to load exam questions. Please try again.');
        return;
      }

      const questions = questionResponse.data;
      const answers = exam.answers || [];

      // Calculate score and create detailed results
      let correctAnswers = 0;
      const results = questions.map((question, index) => {
        const questionId = question._id.toString();
        const userAnswer = answers.find(a => a.questionId?.toString() === questionId);
        const selectedAnswerLetter = userAnswer?.selectedAnswer || '';
        const isCorrect = userAnswer?.isCorrect || false;

        if (isCorrect) correctAnswers++;

        const userAnswerText = selectedAnswerLetter ?
          question.options[selectedAnswerLetter.charCodeAt(0) - 65] : 'Not answered';
        const correctAnswerText = question.options[question.correctAnswer.charCodeAt(0) - 65];

        return {
          questionNumber: index + 1,
          questionText: question.questionText,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect: isCorrect
        };
      });

      const totalQuestions = questions.length;
      const score = Math.round((correctAnswers / totalQuestions) * 100);

      // Create detailed results message
      let resultMessage = `📊 ${exam.title || 'Exam'} Results\n\n`;
      resultMessage += `Score: ${score}%\n`;
      resultMessage += `Correct Answers: ${correctAnswers}/${totalQuestions}\n\n`;
      resultMessage += `Detailed Results:\n\n`;

      results.forEach(result => {
        resultMessage += `Q${result.questionNumber}: ${result.isCorrect ? '✅ Correct' : '❌ Wrong'}\n`;
        resultMessage += `Your answer: ${result.userAnswer}\n`;
        resultMessage += `Correct answer: ${result.correctAnswer}\n\n`;
      });

      // Show results in alert (could be replaced with a modal in future)
      alert(resultMessage);

    } catch (error) {
      console.error('View results error:', error);
      alert('Failed to load exam results. Please try again.');
    }
  };

  const handleLogout = () => {
    authHelpers.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h4>Error Loading Dashboard</h4>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Navigation */}
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand fw-bold text-primary fs-4">
            ProctorAI
          </Link>

            <div className="d-flex align-items-center">
            <button className="btn btn-outline-secondary me-3 position-relative">
              <i className="bi bi-bell fs-5"></i>
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                3
              </span>
            </button>

            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                <img src={user?.photo || `data:image/svg+xml;base64,${btoa(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="#6c757d"/><text x="16" y="20" text-anchor="middle" fill="white" font-size="14" font-family="Arial">${user?.name?.charAt(0) || 'U'}</text></svg>`)}`} alt="User" className="rounded-circle me-2" width="32" height="32" />
                <span>{user?.name || 'User'}</span>
              </button>
              <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={() => navigate('/profile')}><i className="bi bi-person me-2"></i>Profile</button></li>
                <li><button className="dropdown-item" onClick={() => navigate('/profile')}><i className="bi bi-gear me-2"></i>Settings</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2"></i>Logout</button></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="container-fluid">
        <div className="row">
          {/* Main Content */}
          <div className="col-12 p-4">
            {error && (
              <div className="alert alert-warning alert-dismissible fade show" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
                <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
              </div>
            )}
            {/* Dashboard Overview Cards */}
            <div className="row g-4 mb-5">
              <div className="col-md-3">
                <div className="card shadow-sm rounded-3 border-0">
                  <div className="card-body text-center">
                    <div className="text-primary mb-3">
                      <i className="bi bi-journal-check fs-1"></i>
                    </div>
                    <h4 className="card-title fw-bold text-primary mb-1">{dashboardStats.totalExams}</h4>
                    <p className="card-text text-muted small mb-0">Total Exams Appeared</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm rounded-3 border-0">
                  <div className="card-body text-center">
                    <div className="text-warning mb-3">
                      <i className="bi bi-calendar-event fs-1"></i>
                    </div>
                    <h4 className="card-title fw-bold text-warning mb-1">{dashboardStats.upcomingExams}</h4>
                    <p className="card-text text-muted small mb-0">Upcoming Exams</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm rounded-3 border-0">
                  <div className="card-body text-center">
                    <div className="text-info mb-3">
                      <i className="bi bi-clock-history fs-1"></i>
                    </div>
                    <h4 className="card-title fw-bold text-info mb-1">{dashboardStats.pendingResults}</h4>
                    <p className="card-text text-muted small mb-0">Pending Results</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card shadow-sm rounded-3 border-0">
                  <div className="card-body text-center">
                    <div className="text-success mb-3">
                      <i className="bi bi-shield-check fs-1"></i>
                    </div>
                    <h4 className="card-title fw-bold text-success mb-1">{dashboardStats.proctoringScore}%</h4>
                    <p className="card-text text-muted small mb-0">Proctoring Score</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              {/* Left Column - Main Content */}
              <div className="col-lg-8">
                {/* Upcoming Exams */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0 fw-bold">
                      <i className="bi bi-calendar-event me-2 text-primary"></i>
                      My Upcoming Exams
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 fw-semibold ps-4">Exam Name</th>
                            <th className="border-0 fw-semibold">Date</th>
                            <th className="border-0 fw-semibold">Duration</th>
                            <th className="border-0 fw-semibold">Countdown</th>
                            <th className="border-0 fw-semibold">Status</th>
                            <th className="border-0 fw-semibold pe-4">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingExams.map((exam, index) => {
                            const calculateCountdown = () => {
                              if (exam.timeStatus !== 'future') return '';

                              const now = new Date().getTime();
                              const target = new Date(exam.startTime).getTime();
                              const difference = target - now;

                              if (difference > 0) {
                                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                                let countdown = '';
                                if (days > 0) countdown += `${days}d `;
                                if (hours > 0 || days > 0) countdown += `${hours}h `;
                                countdown += `${minutes}m ${seconds}s`;

                                return countdown.trim();
                              }
                              return '';
                            };

                            const countdown = calculateCountdown();

                            return (
                              <tr key={index}>
                                <td className="ps-4 fw-medium">{exam.title || exam.name || 'Untitled Exam'}</td>
                                <td>{exam.scheduleDate ? new Date(exam.scheduleDate).toLocaleDateString() : 'N/A'}</td>
                                <td>{exam.duration ? `${exam.duration} min` : 'N/A'}</td>
                                <td>
                                  {exam.timeStatus === 'future' && countdown && (
                                    <span className="badge bg-info text-dark">
                                      <i className="bi bi-clock me-1"></i>
                                      {countdown}
                                    </span>
                                  )}
                                  {exam.timeStatus === 'active' && (
                                    <span className="badge bg-success">
                                      <i className="bi bi-play-circle me-1"></i>
                                      Available Now
                                    </span>
                                  )}
                                  {exam.timeStatus === 'expired' && (
                                    <span className="badge bg-danger">
                                      <i className="bi bi-x-circle me-1"></i>
                                      Expired
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${exam.status === 'Live' ? 'bg-success' : 'bg-warning'}`}>
                                    {exam.status}
                                  </span>
                                </td>
                                <td className="pe-4">
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    disabled={!exam.canStart}
                                    onClick={() => handleStartExam(exam)}
                                  >
                                    {exam.canStart ? 'Start Exam' : 'Not Available'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Completed Exams with Results */}
                {completedExams.length > 0 && (
                  <div className="card shadow-sm mb-4">
                    <div className="card-header bg-success text-white">
                      <h5 className="card-title mb-0 fw-bold">
                        <i className="bi bi-trophy me-2"></i>
                        Completed Exams & Results
                      </h5>
                    </div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="border-0 fw-semibold ps-4">Exam Name</th>
                              <th className="border-0 fw-semibold">Completed Date</th>
                              <th className="border-0 fw-semibold">Score</th>
                              <th className="border-0 fw-semibold">Status</th>
                              <th className="border-0 fw-semibold pe-4">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {completedExams.map((exam, index) => (
                              <tr key={index}>
                                <td className="ps-4 fw-medium">{exam.title || exam.name || 'Untitled Exam'}</td>
                                <td>{exam.submittedAt ? new Date(exam.submittedAt).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                  <span className={`badge ${exam.score >= 70 ? 'bg-success' : exam.score >= 50 ? 'bg-warning' : 'bg-danger'}`}>
                                    {exam.score}%
                                  </span>
                                </td>
                                <td>
                                  <span className="badge bg-success">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Completed
                                  </span>
                                </td>
                                <td className="pe-4">
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleViewResults(exam)}
                                  >
                                    <i className="bi bi-eye me-1"></i>
                                    View Results
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="card shadow-sm">
                  <div className="card-header bg-white">
                    <h5 className="card-title mb-0 fw-bold">
                      <i className="bi bi-activity me-2 text-primary"></i>
                      Recent Activity
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group list-group-flush">
                      {recentActivities.map((activity, index) => (
                        <div key={index} className="d-flex align-items-center p-3 border-bottom">
                          <div className={`${activity.color} me-3 fs-4`}>
                            <i className={`bi ${activity.icon}`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <p className="mb-0 fw-medium">{activity.message}</p>
                            <small className="text-muted">{activity.time}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Widgets */}
              <div className="col-lg-4">
                {/* Exam Instructions */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header bg-white">
                    <h6 className="card-title mb-0 fw-bold">
                      <i className="bi bi-info-circle me-2 text-warning"></i>
                      Important Exam Instructions
                    </h6>
                  </div>
                  <div className="card-body">
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2 d-flex align-items-start">
                        <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                        <small>Keep your camera on throughout the exam</small>
                      </li>
                      <li className="mb-2 d-flex align-items-start">
                        <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                        <small>No background noise or disturbances</small>
                      </li>
                      <li className="mb-2 d-flex align-items-start">
                        <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                        <small>Stable internet connection required</small>
                      </li>
                      <li className="mb-2 d-flex align-items-start">
                        <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                        <small>No switching tabs or windows</small>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Profile Widget */}
                <div className="card shadow-sm">
                  <div className="card-body text-center">
                    <div className="mb-3">
                      <img
                        src={user?.photo || `data:image/svg+xml;base64,${btoa(`<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="40" fill="#6c757d"/><text x="40" y="48" text-anchor="middle" fill="white" font-size="32" font-family="Arial">${user?.name?.charAt(0) || 'U'}</text></svg>`)}`}
                        alt="Profile"
                        className="rounded-circle border"
                        width="80"
                        height="80"
                      />
                    </div>
                    <h6 className="card-title fw-bold mb-1">{user?.name || 'User'}</h6>
                    <p className="text-muted small mb-2">Student ID: {user?._id?.slice(-6) || 'N/A'}</p>
                    <p className="text-muted small mb-3">{user?.email || 'user@example.com'}</p>
                    <span className="badge bg-success">
                      <i className="bi bi-shield-check me-1"></i>
                      {user?.role === 'admin' ? 'Administrator' : 'Verified Student'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default Dashboard;
