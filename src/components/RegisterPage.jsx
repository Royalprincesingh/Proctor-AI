import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      if (response.success) {
        setSuccess('Account created successfully! Redirecting to login...');

        // Store token in localStorage if available
        const token = response.data?.token || response.token;
        const userData = response.data?.user || response.data;
        
        if (token) {
          localStorage.setItem('token', token);
        }
        localStorage.setItem('user', JSON.stringify(userData));

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5 px-4">
      <div className="col-lg-5 col-md-7 col-12">
        {/* Header */}
        <div className="text-center mb-4">
          <Link to="/" className="text-decoration-none">
            <h1 className="h2 fw-bold text-primary">ProctorAI</h1>
          </Link>
          <h2 className="h3 fw-bold text-dark mt-3">Create Your Account</h2>
          <p className="text-muted small">
            Join thousands of institutions using ProctorAI for secure online examinations
          </p>
        </div>

        {/* Registration Form */}
        <div className="glassmorphism p-4 p-md-5 w-100" style={{maxWidth: '32rem'}}>
          <div className="text-center mb-4">
            <h3 className="h4 fw-bold text-dark">Create Account</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label fw-medium text-dark">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="form-control form-control-lg border"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label fw-medium text-dark">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control form-control-lg border"
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="phone" className="form-label fw-medium text-dark">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-control form-control-lg border"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label fw-medium text-dark">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="form-control form-control-lg border"
                placeholder="Create a strong password"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label fw-medium text-dark">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="form-control form-control-lg border"
                placeholder="Confirm your password"
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success" role="alert">
                <i className="bi bi-check-circle me-2"></i>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100 mb-3 fw-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Terms and Conditions */}
          <div className="text-center">
            <p className="text-muted small mb-3">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-primary text-decoration-none">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-primary text-decoration-none">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-3">
          <p className="text-muted small">
            Already have an account?{' '}
            <Link to="/" className="text-primary text-decoration-none fw-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
