# ProctorAI - AI-Powered Online Exam Monitoring System

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)

## 🎯 Overview

ProctorAI is a comprehensive online examination proctoring system that leverages AI and machine learning to prevent cheating and ensure exam integrity. The system includes:

- **Real-time AI Proctoring**: Face detection, screen monitoring, and audio analysis
- **Admin Dashboard**: Comprehensive monitoring and analytics
- **Student Portal**: Secure exam-taking interface
- **Alert System**: Real-time notifications for suspicious activities

## 🛠️ Tech Stack

### Frontend
- **React 19.2** - UI Framework
- **Vite 7.2** - Build tool
- **Bootstrap 5.3** - UI Components
- **React Router 7.9** - Client-side routing

### Backend
- **Node.js/Express 5.1** - Server framework
- **MongoDB 9.0** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Express Rate Limit** - API security

### Monitoring
- **Python** - Monitoring service
- **OpenCV** - Face detection
- **PyAudio** - Audio monitoring
- **MSS** - Screen capture

## 📦 Prerequisites

- Node.js 16+ and npm 8+
- MongoDB 5.0+ (running on localhost:27017)
- Python 3.9+
- Git

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd proctor-app
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../
npm install
```

### 4. Install Python Dependencies (Optional)
```bash
cd monitoring
pip install -r requirements.txt
```

## ⚙️ Configuration

### Backend Setup

1. **Create `.env` file** in `backend/` directory:
```bash
cp backend/.env.example backend/.env
```

2. **Edit `backend/.env`** with your configuration:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/proctor_db

# JWT Configuration (Change this in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

3. **Create Admin User**:
```bash
cd backend
node createAdmin.js
```

This will create an admin account:
- **Email**: admin@proctorai.com
- **Password**: admin123

**⚠️ Change these credentials after first login!**

## 🎮 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend runs on http://localhost:5173
```

**Terminal 3 - Python Monitoring (Optional):**
```bash
cd monitoring
python main_monitor.py
```

### Production Build

```bash
# Frontend
npm run build

# Backend runs with
npm start
```

## 🔐 Security Features Implemented

✅ **JWT Authentication** - Secure token-based auth
✅ **Password Hashing** - bcryptjs with salt rounds
✅ **Rate Limiting** - Protects against brute force attacks
✅ **Input Validation** - Express-validator on all endpoints
✅ **CORS Configuration** - Restricted to specified origins
✅ **Security Headers** - X-Content-Type-Options, X-Frame-Options, etc.
✅ **Protected Routes** - Admin and student role-based access

### Rate Limiting
- **General**: 100 requests per 15 minutes per IP
- **Login**: 5 attempts per 15 minutes per IP
- **Register**: 3 accounts per hour per IP

## 🔌 API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "+1234567890"
}

Response: { success: true, data: { user }, message: "Registered" }
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response: { success: true, token: "jwt_token", user: { ... } }
```

### Admin Endpoints

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer <token>

Response: { success: true, count: 10, data: [...] }
```

#### Get Dashboard Statistics
```http
GET /api/admin/stats
Authorization: Bearer <token>

Response: {
  success: true,
  data: {
    totalUsers: 150,
    totalExams: 25,
    ongoingExams: 3,
    alertsToday: 12
  }
}
```

#### Get All Alerts
```http
GET /api/proctor/events/all
Authorization: Bearer <token>

Response: { success: true, count: 50, data: [...] }
```

### Exam Endpoints

#### Create Exam (Admin Only)
```http
POST /api/exams/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Math Final Exam",
  "description": "Comprehensive mathematics exam",
  "duration": 120,
  "totalQuestions": 50,
  "scheduleDate": "2025-12-15T10:00:00Z"
}

Response: { success: true, data: { exam }, message: "Exam created successfully" }
```

#### Get User's Exams
```http
GET /api/exams/user/{userId}
Authorization: Bearer <token>

Response: { success: true, count: 5, data: [...] }
```

#### Assign Exam to Students
```http
POST /api/schedule/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "examId": "exam_id",
  "userIds": ["user_id_1", "user_id_2"]
}

Response: { success: true, message: "Candidates assigned successfully", assigned: [...] }
```

### Proctoring Endpoints

#### Log Event
```http
POST /api/proctor/log-event
Authorization: Bearer <token>
Content-Type: application/json

{
  "examId": "exam_id",
  "type": "tab_switch",
  "details": "User switched to another tab"
}

Response: { success: true, data: { alert }, message: "Event logged successfully" }
```

#### Photo Match
```http
POST /api/proctor/photo-match
Authorization: Bearer <token>
Content-Type: application/json

{
  "examId": "exam_id",
  "detectedFaceURL": "data:image/jpeg;base64,...",
  "confidence": 85
}

Response: { success: true, data: { status, confidence, photoLogId } }
```

## 📁 Project Structure

```
proctor-app/
├── backend/
│   ├── controllers/          # Business logic
│   │   └── authController.js
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── Exam.js
│   │   ├── Schedule.js
│   │   ├── Alert.js
│   │   ├── Question.js
│   │   └── PhotoLog.js
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── examRoutes.js
│   │   ├── proctorRoutes.js
│   │   ├── scheduleRoutes.js
│   │   └── questionRoutes.js
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js
│   │   └── security.js
│   ├── config/              # Configuration files
│   │   └── db.js
│   ├── server.js            # Express app setup
│   ├── createAdmin.js       # Admin user creation script
│   ├── .env.example         # Environment template
│   └── package.json
│
├── src/
│   ├── components/          # React components
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── ExamTaking.jsx
│   │   ├── CreateExam.jsx
│   │   └── RegisterPage.jsx
│   ├── services/            # API client
│   │   └── api.js
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # Entry point
│   └── index.css
│
├── monitoring/              # Python monitoring service
│   ├── main_monitor.py
│   ├── face_detection.py
│   ├── screen_monitor.py
│   ├── audio_monitor.py
│   ├── requirements.txt
│   └── config.json
│
└── README.md
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Make sure MongoDB is running
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5001
```
**Solution**: Kill process on that port
```bash
lsof -ti:5001 | xargs kill -9
```

### JWT Token Expired
**Solution**: Log out and log back in to get a new token

### CORS Error
**Solution**: Check that `FRONTEND_URL` in backend `.env` matches your frontend URL

## 📊 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/proctor_db` |
| `JWT_SECRET` | Secret key for JWT signing | Required - change in production |
| `PORT` | Backend server port | `5001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## 🔒 Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string in production
- [ ] Change admin credentials after first login
- [ ] Use HTTPS in production
- [ ] Configure HTTPS certificate
- [ ] Update CORS origin to production domain
- [ ] Set `NODE_ENV=production`
- [ ] Enable MongoDB authentication
- [ ] Use environment variables for all secrets
- [ ] Implement rate limiting per user (not just IP)
- [ ] Set up regular database backups

## 📝 Default Credentials

**Admin Login:**
- Email: `admin@proctorai.com`
- Password: `admin123`

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and support, please refer to the documentation or contact the development team.

---

**Last Updated**: November 30, 2025
**Version**: 1.0.0
