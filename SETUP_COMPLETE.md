# MongoDB Setup - Complete ✅

## Database Status

✅ **MongoDB Server**: Running on port 27017
✅ **Database**: proctor_db
✅ **Users Created**: 4 users in database

---

## Test Credentials Available

### Admin Account
- **Email**: admin@proctorai.com
- **Password**: admin123
- **Role**: Admin
- **Access**: Full admin dashboard

### Test Student Account
- **Email**: student@test.com
- **Password**: 123456
- **Role**: Student
- **Access**: Student dashboard

---

## Quick Start Commands

### Terminal 1 - Start Backend
```bash
cd /Users/royalsingh/Public/project/AI/proctor-app/backend
npm run dev
```
Expected output:
```
✅ MongoDB connected
🚀 Server running on port 5001
```

### Terminal 2 - Start Frontend
```bash
cd /Users/royalsingh/Public/project/AI/proctor-app
npm run dev
```
Expected output:
```
VITE v7.2.4  ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Terminal 3 - Test API (Optional)
```bash
# Test login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@proctorai.com","password":"admin123"}'
```

---

## What's in MongoDB

- 4 total users
- 1 admin user
- 3 other users (including test student)
- Ready for exam data, schedules, alerts, etc.

---

## Next Steps

1. ✅ MongoDB is running
2. ✅ Admin user created
3. ✅ Test student account ready
4. Start backend: `npm run dev` (in backend folder)
5. Start frontend: `npm run dev` (in root folder)
6. Open http://localhost:5173 in browser
7. Login with admin credentials
8. Access admin dashboard at /admin

---

## Database Files Location

MongoDB data is stored at:
```
~/Library/Application Support/MongoDB/
```

To backup database:
```bash
mongodump --db proctor_db --out /path/to/backup
```

---

## If MongoDB Stops

Restart it:
```bash
brew services start mongodb-community
```

Check status:
```bash
brew services list | grep mongodb
```

---

**All MongoDB setup is complete! Ready to run the application.** ��
