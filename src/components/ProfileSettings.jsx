import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, authHelpers } from '../services/api';

const ProfileSettings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    try {
      // Get current session using auth helpers
      const session = authHelpers.getCurrentSession();
      if (!session || session.type !== 'user') {
        console.log('No valid user session found, redirecting to login');
        navigate('/');
        return;
      }

      const userData = session.user;
      const userId = userData.id || userData._id;
      if (!userId) {
        console.log('No user ID found in session');
        navigate('/');
        return;
      }

      console.log('Loading user data for:', userData.name);
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });
      if (userData.photo && !userData.photo.startsWith('data:image/svg+xml')) {
        setPreviewUrl(userData.photo);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setMessage('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      setMessage('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');

    try {
      let photoData = user.photo; // Keep existing photo if no new one uploaded

      // If a new file was selected, upload it
      if (selectedFile) {
        console.log('Uploading photo...', selectedFile);
        const formDataObj = new FormData();
        formDataObj.append('photo', selectedFile);

        const session = authHelpers.getCurrentSession();
        const token = session?.token;

        const uploadResponse = await fetch('http://localhost:5001/api/auth/upload-photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj
        });

        console.log('Upload response status:', uploadResponse.status);
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('Upload response data:', uploadData);
          // Ensure we have the full URL for the photo
          photoData = uploadData.photoUrl.startsWith('http')
            ? uploadData.photoUrl
            : `http://localhost:5001${uploadData.photoUrl}`;
          console.log('Final photo URL:', photoData);
        } else {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Failed to upload photo: ${uploadResponse.status} ${errorText}`);
        }
      }

      // Update profile information
      const session = authHelpers.getCurrentSession();
      const token = session?.token;

      const updateResponse = await fetch('http://localhost:5001/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          photo: photoData
        })
      });

      if (updateResponse.ok) {
        const updatedUser = await updateResponse.json();

        // Update session storage with new user data
        const updatedUserData = { ...user, ...updatedUser.data };
        authHelpers.loginUser(token, updatedUserData);
        setUser(updatedUserData);

        setMessage('Profile updated successfully!');
        setSelectedFile(null);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Navigation */}
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-link text-decoration-none p-0 me-3"
              onClick={() => navigate('/dashboard')}
            >
              <i className="bi bi-arrow-left fs-5"></i>
            </button>
            <Link to="/" className="navbar-brand fw-bold text-primary fs-4">
              ProctorAI
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-white">
                <h4 className="card-title mb-0 fw-bold">
                  <i className="bi bi-person-gear me-2 text-primary"></i>
                  Profile Settings
                </h4>
              </div>
              <div className="card-body">
                {message && (
                  <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-danger'} mb-4`}>
                    {message}
                  </div>
                )}

                {/* Profile Photo Section */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Profile Photo</h5>
                  <div className="d-flex align-items-center gap-4">
                    <div className="position-relative">
                      <img
                        src={previewUrl || user?.photo || `data:image/svg+xml;base64,${btoa(`<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="60" fill="#6c757d"/><text x="60" y="72" text-anchor="middle" fill="white" font-size="48" font-family="Arial">${user?.name?.charAt(0) || 'U'}</text></svg>`)}`}
                        alt="Profile"
                        className="rounded-circle border"
                        width="120"
                        height="120"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div>
                      <p className="text-muted small mb-2">
                        Upload a clear photo of yourself for identity verification during exams.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="form-control"
                        style={{ maxWidth: '300px' }}
                      />
                      <small className="text-muted">Max file size: 5MB. Supported formats: JPG, PNG, GIF</small>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Personal Information */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Personal Information</h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="form-control"
                        disabled
                        placeholder="Enter your email"
                      />
                      <small className="text-muted">Email cannot be changed</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="form-control"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                </div>

                <hr />

                {/* Action Buttons */}
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/dashboard')}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Information Card */}
            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h6 className="card-title fw-bold mb-3">
                  <i className="bi bi-info-circle text-info me-2"></i>
                  Why Upload Your Photo?
                </h6>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2 d-flex align-items-start">
                    <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                    <small>Enhanced security during exam identity verification</small>
                  </li>
                  <li className="mb-2 d-flex align-items-start">
                    <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                    <small>Faster exam start process with pre-verified identity</small>
                  </li>
                  <li className="mb-2 d-flex align-items-start">
                    <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                    <small>Reduced chances of identity verification failures</small>
                  </li>
                  <li className="mb-0 d-flex align-items-start">
                    <i className="bi bi-check-circle text-success me-2 mt-1"></i>
                    <small>Professional profile appearance</small>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
