# ProctorAI - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 16+ installed
- MongoDB running locally
- Git installed

### Step 1: Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd proctor-app

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit .env with your settings (optional for local development)
# Default values work fine for local testing
```

### Step 3: Create Admin User

```bash
cd backend
node createAdmin.js
cd ..
```

**Output:**
```
✅ Admin user created successfully!
📧 Email: admin@proctorai.com
🔑 Password: admin123
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend starts on http://localhost:5173
```

### Step 5: Login & Explore

1. Open http://localhost:5173
2. Click "Login" button
3. Use credentials:
   - Email: `admin@proctorai.com`
   - Password: `admin123`
4. Access Admin Dashboard at `/admin`

---

## 📚 What's Been Fixed

✅ **Security**
- Environment variables for secrets
- Rate limiting on API endpoints
- Security headers added
- CORS properly configured
- Input validation on all forms

✅ **Code Quality**
- Global error handler
- Comprehensive logging
- Input sanitization
- Constants centralized

✅ **Documentation**
- `SETUP.md` - Detailed setup guide
- `DEPLOYMENT.md` - Production deployment
- `CODE_REVIEW_FIXES.md` - All fixes documented

---

## 🔒 Important Security Notes

### Change These Immediately:

1. **Admin Password**
   - Login → Profile Settings → Change Password

2. **JWT Secret** (for production)
   - Update `JWT_SECRET` in `backend/.env`
   - Generate new one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **CORS Configuration** (for production)
   - Update `FRONTEND_URL` in `backend/.env`

---

## 📖 Common Tasks

### Create a New Student Account
1. Click "Create Account" on landing page
2. Fill in registration form
3. Use strong password (min 6 characters)
4. Submit

### Assign Exam to Students (Admin)
1. Go to Admin Dashboard
2. Click "Schedule & Timetable"
3. Select exam and students
4. Click "Assign"

### View Real-time Alerts (Admin)
1. Go to Admin Dashboard
2. Click "AI Alerts Logs"
3. See all suspicious activities

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5001 is in use
lsof -i :5001

# Kill process if needed
kill -9 <PID>

# Restart
npm run dev
```

### MongoDB connection error
```bash
# Make sure MongoDB is running
# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

### Can't login
```bash
# Recreate admin user
cd backend
node createAdmin.js
```

### Frontend shows blank page
```bash
# Check if backend is running on port 5001
# Open browser console (F12) to see errors
# Check CORS configuration
```

---

## 📝 Project Structure

```
proctor-app/
├── backend/          # Express API server
├── src/              # React frontend
├── monitoring/       # Python monitoring service
├── SETUP.md         # Setup guide
├── DEPLOYMENT.md    # Deployment guide
└── CODE_REVIEW_FIXES.md  # All fixes documented
```

---

## 🎯 Next Steps

1. ✅ Familiarize yourself with the codebase
2. ✅ Read `SETUP.md` for detailed configuration
3. ✅ Test all authentication flows
4. ✅ Review `CODE_REVIEW_FIXES.md` for security improvements
5. ✅ Deploy to production following `DEPLOYMENT.md`

---

## 🆘 Need Help?

- Check `SETUP.md` for detailed documentation
- Review `CODE_REVIEW_FIXES.md` for all fixes
- Check backend logs: `backend/logs/`
- Browser console (F12) for frontend errors

---

## ✨ Features Included

### For Students
- ✅ Secure login/registration
- ✅ View upcoming exams
- ✅ Take exams with proctoring
- ✅ View results

### For Admins
- ✅ User management
- ✅ Create and manage exams
- ✅ Assign exams to students
- ✅ Real-time monitoring dashboard
- ✅ View alerts and suspicious activities
- ✅ Detailed analytics

### System Features
- ✅ AI face detection
- ✅ Screen monitoring
- ✅ Audio monitoring
- ✅ Real-time alerts
- ✅ Comprehensive logging

---

**Happy Coding! 🎉**

Last Updated: November 30, 2025
