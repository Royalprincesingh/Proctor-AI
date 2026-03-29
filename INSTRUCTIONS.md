# 📚 ProctorAI - Complete Setup & Instructions

## 🎯 Quick Navigation

- **⚡ New to the project?** → Start with [5-Minute Quick Start](#-5-minute-quick-start)
- **🔧 Setting up for development?** → Go to [Development Setup](#-development-setup)
- **🚀 Deploying to production?** → See [Production Deployment](#-production-deployment)
- **📱 Mobile/Device Setup?** → Check [Device Configuration](#-device-configuration)

---

## ⚡ 5-Minute Quick Start

### Prerequisites
- Node.js 16+ (`node --version`)
- MongoDB running locally on port 27017
- npm or yarn

### Step-by-Step

```bash
# 1️⃣  Clone the repository
git clone https://github.com/Royalprincesingh/Proctor-AI.git
cd Proctor-AI

# 2️⃣  Install dependencies
npm install
cd backend && npm install && cd ..

# 3️⃣  Create environment file
cp backend/.env.example backend/.env

# 4️⃣  Start MongoDB (in another terminal)
mongod

# 5️⃣  Create admin user
cd backend && node createAdmin.js && cd ..

# 6️⃣  Start both frontend and backend
npm run dev:all
```

You're done! 🎉
- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Admin: admin@proctorai.com / admin123

---

## 🔧 Development Setup

### 1. Environment Configuration

```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
cat backend/.env.example
```

**Key Environment Variables:**
```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/proctor_db

# JWT (Change this in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server
PORT=5001
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173
```

### 2. Database Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB Community Edition
# macOS:
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian:
sudo apt-get install -y mongodb
sudo systemctl start mongodb

# Windows:
# Download from: https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB Atlas (Cloud)
```bash
# 1. Create account at https://www.mongodb.com/cloud/atlas
# 2. Create cluster
# 3. Update MONGODB_URI in .env:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proctor_db
```

### 3. Create Admin User

```bash
cd backend
node createAdmin.js
```

**Output:**
```
✅ Admin user created successfully!
📧 Email: admin@proctorai.com
🔑 Password: admin123
```

### 4. Development Commands

```bash
# Frontend only (port 5173)
npm run dev

# Admin dashboard (port 5174)
npm run dev:admin

# Both frontend and backend simultaneously
npm run dev:all

# Build for production
npm run build

# Run linter
npm lint

# Preview production build
npm preview
```

### 5. Backend Development

```bash
cd backend

# Start backend server only
npm start

# With nodemon (auto-reload)
npm run dev

# Run tests (if available)
npm test
```

---

## 🚀 Production Deployment

### Before Deploying

**Security Checklist:**
- [ ] Change JWT_SECRET to a strong random string
- [ ] Change MongoDB credentials if using Atlas
- [ ] Update FRONTEND_URL to your domain
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Review security headers in `backend/server.js`
- [ ] Configure CORS for your domain

### Deployment Options

#### Option 1: Heroku (Recommended for beginners)
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create new app
heroku create proctor-ai-app

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set MONGODB_URI=your_atlas_uri
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

#### Option 2: AWS (Scalable)
```bash
# Use Elastic Beanstalk or EC2
# Requires AWS CLI setup
# See DEPLOYMENT.md for detailed steps
```

#### Option 3: DigitalOcean (Simple)
```bash
# Create droplet with Node.js
# SSH into server
ssh root@your_droplet_ip

# Clone and setup
git clone <repo-url>
cd Proctor-AI
npm install && cd backend && npm install

# Use PM2 for process management
npm install -g pm2
pm2 start backend/server.js
pm2 save
pm2 startup
```

#### Option 4: Docker (Best Practice)
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 📱 Device Configuration

### For Student Exams

**System Requirements:**
- Webcam (USB or built-in)
- Microphone
- Stable internet connection (minimum 2 Mbps)
- Screen with minimum 1024x768 resolution

**Browser Compatibility:**
- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Network Requirements:**
```bash
# Test connection before exam
ping -c 4 google.com
curl -I https://proctor-ai-app.com
```

### For Monitoring (Optional)

**Python Environment Setup:**
```bash
# Navigate to monitoring directory
cd monitoring

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run monitoring service
python main_monitor.py
```

---

## 🔍 Testing

### Frontend Testing
```bash
cd /Users/royalsingh/Public/project/AI/proctor-app
npm run lint
```

### Backend Testing
```bash
cd backend
npm test
```

### Monitoring Service Testing
```bash
cd monitoring
python test_monitoring.py
```

---

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
```bash
# Make sure MongoDB is running
mongod

# Or check MongoDB status
sudo systemctl status mongod
```

#### Port Already in Use
```
Error: listen EADDRINUSE :::5001
```
**Solution:**
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

#### JWT/Auth Issues
```bash
# Clear browser cookies
# Clear localStorage: Open DevTools → Application → Storage → Clear All
# Restart development servers
npm run dev:all
```

#### Python Dependencies Error
```bash
# Reinstall Python dependencies
cd monitoring
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

---

## 📊 API Testing

### Using cURL

```bash
# Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@proctorai.com",
    "password": "admin123"
  }'

# Get exams (requires auth token)
curl -X GET http://localhost:5001/api/exams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Import API collection (if available in repo)
3. Set variables for localhost/production URLs
4. Test endpoints

---

## 📖 Project Structure

```
Proctor-AI/
├── src/                          # React Frontend
│   ├── components/               # React components
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ExamTaking.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ...
│   ├── services/
│   │   └── api.js               # API calls
│   ├── App.jsx
│   └── main.jsx
│
├── backend/                      # Node.js Backend
│   ├── models/                   # MongoDB schemas
│   ├── controllers/              # Business logic
│   ├── routes/                   # API endpoints
│   ├── middleware/               # Auth, validation, security
│   ├── utils/                    # Helpers
│   ├── server.js                 # Express app
│   └── createAdmin.js            # Admin creation script
│
├── monitoring/                   # Python Monitoring Service
│   ├── main_monitor.py           # Main entry point
│   ├── face_detection.py
│   ├── screen_monitor.py
│   ├── audio_monitor.py
│   └── requirements.txt
│
└── public/                       # Static files
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary. All rights reserved.

---

## 💬 Support & Questions

- **Issues:** Open an issue on GitHub
- **Documentation:** Check [docs/](./docs/) folder
- **Email:** support@proctorai.com

---

## 🔒 Security

For security concerns, **please email** security@proctorai.com instead of opening public issues.

### Security Features Implemented
✅ JWT Authentication  
✅ Password Hashing (bcryptjs)  
✅ Rate Limiting  
✅ Security Headers  
✅ Input Validation  
✅ CORS Protection  
✅ Environment Variables  
✅ Error Handling  

---

**Last Updated:** March 29, 2026  
**Version:** 1.0.0
