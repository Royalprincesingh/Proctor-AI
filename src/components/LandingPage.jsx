import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { enhancedAuthAPI } from '../services/api';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Login with credentials
      const response = await enhancedAuthAPI.login({ email, password });

      if (response.success && response.user) {
        // Store token based on user role
        if (response.user.role === 'admin') {
          enhancedAuthAPI.loginAsAdmin(response);
        } else {
          enhancedAuthAPI.loginAsUser(response);
        }

        // Redirect based on user role
        const redirectUrl = response.user.role === 'admin'
          ? '/admin'
          : '/dashboard';

        navigate(redirectUrl);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center w-100">
            <h1 className="h4 fw-bold text-primary mb-0">ProctorAI</h1>
            <div className="d-none d-lg-flex gap-4">
              <a href="#features" className="text-muted text-decoration-none">Features</a>
              <a href="#how-it-works" className="text-muted text-decoration-none">How it Works</a>
              <a href="#dashboard" className="text-muted text-decoration-none">Dashboard</a>
              <Link to="/admin" className="text-muted text-decoration-none">Admin</Link>
              <a href="#support" className="text-muted text-decoration-none">Support</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-light py-5" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'}}>
        <div className="container">
          <div className="row align-items-center g-5">
            {/* Left Content */}
            <div className="col-lg-6">
              <div className="mb-4">
                <h1 className="display-4 fw-bold text-dark mb-4">
                  AI-Powered Online Exam Monitoring
                </h1>
                <p className="lead text-muted">
                  Conduct secure, automated, cheating-proof online examinations with advanced AI proctoring.
                </p>
              </div>
              <div className="d-flex flex-column flex-sm-row gap-3">
                <button className="btn btn-primary btn-lg px-4 py-3 fw-semibold">
                  Start Free Demo
                </button>
                <Link to="/register">
                  <button className="btn btn-outline-primary btn-lg px-4 py-3 fw-semibold">
                    Create Account
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Login Form */}
            <div className="col-lg-6 d-flex justify-content-center justify-content-lg-end">
              <div className="glassmorphism p-4 p-md-5 w-100" style={{maxWidth: '28rem'}}>
                <div className="text-center mb-4">
                  <h2 className="h4 fw-bold text-dark">Login to Continue</h2>
                </div>
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label fw-medium text-dark">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control form-control-lg border"
                      placeholder="Enter your email"
                      required
                    />
                    <small className="text-muted">
                      Admin accounts available in database
                    </small>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-medium text-dark">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control form-control-lg border"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mb-3 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>

                  {/* Test API Connection Button */}
                  <button
                    type="button"
                    className="btn btn-outline-info btn-sm w-100 mb-2"
                    onClick={async () => {
                      try {
                        const response = await fetch('http://localhost:5001/api/health');
                        const data = await response.json();
                        alert('API Connection: ' + (response.ok ? 'SUCCESS' : 'FAILED') + '\n' + JSON.stringify(data, null, 2));
                      } catch (err) {
                        alert('API Connection Error: ' + err.message);
                      }
                    }}
                  >
                    Test API Connection
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-lg w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                  >
                    <svg className="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>
                </form>
                <div className="text-center">
                  <p className="small text-muted mb-2">
                    Don't have an account? <Link to="/register" className="text-primary text-decoration-none">Register</Link>
                  </p>
                  <p className="small">
                    <a href="#" className="text-primary text-decoration-none">Forgot password?</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h2 fw-bold text-dark mb-4">Advanced AI Proctoring Features</h2>
            <p className="lead text-muted">Comprehensive monitoring and security for online examinations</p>
          </div>
          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="text-center p-4 rounded shadow-sm">
                <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: '4rem', height: '4rem'}}>
                  <svg className="text-primary" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Real-time AI Proctoring</h3>
                <p className="text-muted mb-0">Continuous monitoring with advanced AI algorithms</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="text-center p-4 rounded shadow-sm">
                <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: '4rem', height: '4rem'}}>
                  <svg className="text-info" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Face Detection & Analysis</h3>
                <p className="text-muted mb-0">Advanced facial recognition and behavior analysis</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="text-center p-4 rounded shadow-sm">
                <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: '4rem', height: '4rem'}}>
                  <svg className="text-success" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Screen & Audio Monitoring</h3>
                <p className="text-muted mb-0">Comprehensive screen capture and audio surveillance</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="text-center p-4 rounded shadow-sm">
                <div className="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: '4rem', height: '4rem'}}>
                  <svg className="text-danger" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Auto Cheating Alerts</h3>
                <p className="text-muted mb-0">Instant notifications for suspicious activities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h2 fw-bold text-dark mb-4">How It Works</h2>
            <p className="lead text-muted">Simple 3-step process for secure online examinations</p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="text-center">
                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 text-white fw-bold" style={{width: '5rem', height: '5rem', fontSize: '2rem'}}>
                  1
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Candidate Logs In</h3>
                <p className="text-muted">Students access the exam platform and begin identity verification</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="bg-info rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 text-white fw-bold" style={{width: '5rem', height: '5rem', fontSize: '2rem'}}>
                  2
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">AI Identity Verification</h3>
                <p className="text-muted">Advanced AI systems verify identity and monitor throughout the exam</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center">
                <div className="bg-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 text-white fw-bold" style={{width: '5rem', height: '5rem', fontSize: '2rem'}}>
                  3
                </div>
                <h3 className="h5 fw-semibold text-dark mb-3">Real-time Monitoring</h3>
                <p className="text-muted">Continuous proctoring with instant alerts for any suspicious activity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="h2 fw-bold text-dark mb-4">Admin Dashboard Preview</h2>
            <p className="lead text-muted">Powerful monitoring tools at your fingertips</p>
          </div>
          <div className="bg-dark rounded p-4 shadow-lg">
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="bg-secondary rounded p-4 mb-4">
                  <h3 className="text-white h5 fw-semibold mb-4">Live Webcam Feed</h3>
                  <div className="bg-dark rounded d-flex align-items-center justify-content-center" style={{height: '16rem'}}>
                    <span className="text-light">Live Camera Feed</span>
                  </div>
                </div>
                <div className="bg-secondary rounded p-4">
                  <h3 className="text-white h5 fw-semibold mb-4">Timeline Events</h3>
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center text-light">
                      <div className="bg-success rounded-circle me-3" style={{width: '0.5rem', height: '0.5rem'}}></div>
                      <span>Exam Started - 10:00 AM</span>
                    </div>
                    <div className="d-flex align-items-center text-light">
                      <div className="bg-warning rounded-circle me-3" style={{width: '0.5rem', height: '0.5rem'}}></div>
                      <span>Face Detection Alert - 10:15 AM</span>
                    </div>
                    <div className="d-flex align-items-center text-light">
                      <div className="bg-info rounded-circle me-3" style={{width: '0.5rem', height: '0.5rem'}}></div>
                      <span>Screen Activity Normal - 10:30 AM</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="bg-secondary rounded p-4 mb-4">
                  <h3 className="text-white h5 fw-semibold mb-4">Alerts Panel</h3>
                  <div className="d-flex flex-column gap-3">
                    <div className="bg-danger bg-opacity-25 border border-danger rounded p-3">
                      <p className="text-danger-emphasis small mb-1">Multiple faces detected</p>
                      <span className="text-danger small">2 min ago</span>
                    </div>
                    <div className="bg-warning bg-opacity-25 border border-warning rounded p-3">
                      <p className="text-warning-emphasis small mb-1">Browser tab switched</p>
                      <span className="text-warning small">5 min ago</span>
                    </div>
                  </div>
                </div>
                <div className="bg-secondary rounded p-4">
                  <h3 className="text-white h5 fw-semibold mb-4">Exam Performance</h3>
                  <div className="d-flex flex-column gap-4">
                    <div>
                      <div className="d-flex justify-content-between small text-light mb-2">
                        <span>Completion Rate</span>
                        <span>75%</span>
                      </div>
                      <div className="progress bg-dark" style={{height: '0.5rem'}}>
                        <div className="progress-bar bg-primary" style={{width: '75%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="d-flex justify-content-between small text-light mb-2">
                        <span>Time Remaining</span>
                        <span>45 min</span>
                      </div>
                      <div className="progress bg-dark" style={{height: '0.5rem'}}>
                        <div className="progress-bar bg-success" style={{width: '60%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-light py-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-3">
              <h3 className="h5 fw-bold mb-4">ProctorAI</h3>
              <p className="text-light opacity-75">Advanced AI-powered online exam proctoring system for secure examinations.</p>
            </div>
            <div className="col-lg-3">
              <h4 className="h6 fw-semibold mb-4">Product</h4>
              <ul className="list-unstyled text-light opacity-75">
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Features</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Pricing</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Security</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Integrations</a></li>
              </ul>
            </div>
            <div className="col-lg-3">
              <h4 className="h6 fw-semibold mb-4">Resources</h4>
              <ul className="list-unstyled text-light opacity-75">
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Documentation</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">API Reference</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Help Center</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Community</a></li>
              </ul>
            </div>
            <div className="col-lg-3">
              <h4 className="h6 fw-semibold mb-4">Support</h4>
              <ul className="list-unstyled text-light opacity-75">
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Contact Us</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Privacy Policy</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Terms of Service</a></li>
                <li className="mb-2"><a href="#" className="text-decoration-none text-light">Status</a></li>
              </ul>
            </div>
          </div>
          <hr className="my-4 bg-light opacity-25" />
          <div className="d-flex flex-column flex-lg-row justify-content-between align-items-center">
            <p className="text-light opacity-75 mb-3 mb-lg-0">&copy; 2025 ProctorAI. All rights reserved.</p>
            <div className="d-flex gap-3">
              <a href="#" className="text-light opacity-75">
                <svg className="flex-shrink-0" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-light opacity-75">
                <svg className="flex-shrink-0" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-light opacity-75">
                <svg className="flex-shrink-0" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
