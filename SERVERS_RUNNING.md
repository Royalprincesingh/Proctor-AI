# ✅ ProctorAI - Servers Running

## Current Status

### Backend Server ✅
- **Status**: Running
- **Port**: 5001
- **URL**: http://localhost:5001
- **MongoDB**: Connected to proctor_db
- **Process**: Running in background

### Frontend Server ✅
- **Status**: Running  
- **Port**: 5173
- **URL**: http://localhost:5173
- **Process**: Running in background

---

## How to Access

1. **Open Browser**: http://localhost:5173
2. **Login with Admin**:
   - Email: `admin@proctorai.com`
   - Password: `admin123`
3. **Or Login as Student**:
   - Email: `student@test.com`
   - Password: `123456`

---

## To Stop Servers

```bash
# Kill backend
pkill -f "node server.js"

# Kill frontend  
pkill -f "vite"
```

## To Restart Servers

```bash
# Backend (Terminal 1)
cd /Users/royalsingh/Public/project/AI/proctor-app/backend
npm start

# Frontend (Terminal 2)
cd /Users/royalsingh/Public/project/AI/proctor-app
npm run dev
```

---

## API Endpoints

All endpoints require authentication token (except /auth/login and /auth/register)

### Auth Routes
- POST `/api/auth/login` - Login user
- POST `/api/auth/register` - Register new user
- GET `/api/auth/me` - Get current user (protected)

### Admin Routes  
- GET `/api/admin/users` - Get all users
- GET `/api/admin/stats` - Get system stats
- PUT `/api/admin/users/:id` - Update user

### Exam Routes
- GET `/api/exams/all` - Get all exams
- POST `/api/exams/create` - Create exam
- GET `/api/exams/:id` - Get exam details

### Proctor Routes
- POST `/api/proctor/log-event` - Log event
- POST `/api/proctor/photo-match` - Photo matching
- GET `/api/proctor/events/:examId` - Get alerts

---

## Troubleshooting

### "Connection Refused" Error
```bash
# Check if port 5001 is in use
lsof -i :5001

# Check if port 5173 is in use  
lsof -i :5173

# If in use, kill process and restart
pkill -f "node server.js"
pkill -f "vite"
```

### MongoDB Connection Issues
```bash
# Check MongoDB status
brew services list | grep mongodb

# Restart MongoDB if needed
brew services restart mongodb-community
```

### Frontend Can't Connect to Backend
- Verify backend is running: `curl http://localhost:5001/`
- Verify frontend config: Check `src/config.js`
- Check CORS: Backend should have `FRONTEND_URL=http://localhost:5173` in `.env`

---

**Everything is ready to use! 🎉**
