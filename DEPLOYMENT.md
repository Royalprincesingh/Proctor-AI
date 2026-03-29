# Deployment Guide

## Production Deployment Checklist

### 1. Security Configuration

- [ ] Change `JWT_SECRET` to a strong random string
  ```bash
  # Generate strong secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] Change admin credentials
  - Email: admin@proctorai.com → Change to your email
  - Password: admin123 → Change to strong password

- [ ] Enable HTTPS/TLS
  - Use Let's Encrypt or similar
  - Update `FRONTEND_URL` to https://

- [ ] Configure MongoDB authentication
  - Enable MongoDB user authentication
  - Use strong passwords
  - Restrict network access

- [ ] Update CORS settings
  ```javascript
  cors({
    origin: 'https://yourdomain.com',
    credentials: true
  })
  ```

### 2. Environment Setup

Create `backend/.env.production`:
```env
NODE_ENV=production
PORT=5001

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/proctor_db

# JWT
JWT_SECRET=your-very-secure-random-secret-here

# URLs
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://yourdomain.com/api

# Optional
PYTHON_MONITOR_URL=https://monitor.yourdomain.com
```

### 3. Database Setup

#### Option A: MongoDB Atlas (Cloud)
```bash
1. Create account at mongodb.com/cloud
2. Create a cluster
3. Set up authentication
4. Get connection string
5. Add to MONGODB_URI in .env
```

#### Option B: Self-hosted MongoDB
```bash
# Create MongoDB user
db.createUser({
  user: "proctor_user",
  pwd: "strong_password",
  roles: [ "readWrite" ]
})

# Enable authentication in MongoDB config
security:
  authorization: "enabled"
```

### 4. Backend Deployment

#### Option A: Railway
```bash
1. Push code to GitHub
2. Connect Railway to GitHub
3. Set environment variables
4. Deploy
```

#### Option B: Heroku
```bash
# Login
heroku login

# Create app
heroku create proctor-app

# Add MongoDB
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET="your_secret"

# Deploy
git push heroku main
```

#### Option C: DigitalOcean App Platform
```bash
1. Create new app
2. Connect GitHub repository
3. Configure environment
4. Deploy
```

#### Option D: AWS EC2
```bash
# Connect to instance
ssh -i key.pem ubuntu@your-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb

# Clone repository
git clone your-repo
cd proctor-app/backend
npm install

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "ProctorAI"
pm2 save
pm2 startup

# Setup Nginx reverse proxy
sudo apt-get install nginx
```

### 5. Frontend Deployment

#### Option A: Vercel
```bash
npm install -g vercel
vercel
# Follow prompts
```

#### Option B: Netlify
```bash
1. Push code to GitHub
2. Connect Netlify to GitHub
3. Build command: npm run build
4. Publish directory: dist
5. Set environment variables
6. Deploy
```

#### Option C: AWS S3 + CloudFront
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Create CloudFront distribution
# Point CNAME to CloudFront
```

#### Option D: GitHub Pages
```bash
# For documentation only (not recommended for dynamic app)
npm run build
```

### 6. Reverse Proxy Setup (Nginx)

Create `/etc/nginx/sites-available/proctor-app`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/proctor-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate Setup

Using Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d api.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 8. Database Backups

#### MongoDB Atlas
- Automatic backups enabled by default
- Continuous backup available

#### Self-hosted MongoDB
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/home/ubuntu/mongodb_backups"
mongodump --out $BACKUP_DIR/$(date +%Y%m%d)

# Add to crontab
0 2 * * * /home/ubuntu/backup_mongodb.sh
```

### 9. Monitoring & Logging

#### PM2 Monitoring
```bash
pm2 install pm2-auto-pull
pm2 install pm2-logrotate
pm2 logs
```

#### Application Logging
- Check logs in `backend/logs/` directory
- Use aggregation services (ELK, Splunk)

### 10. Performance Optimization

- [ ] Enable gzip compression
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1024;
```

- [ ] Enable caching
```nginx
location ~* .(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

- [ ] Use CDN for static assets
- [ ] Enable database indexing

### 11. Monitoring & Alerting

Set up monitoring for:
- Server uptime (UptimeRobot, Pingdom)
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Log aggregation (ELK Stack, Loggly)

### 12. Backup & Disaster Recovery

- [ ] Daily database backups
- [ ] Weekly full backups
- [ ] Test restore procedures monthly
- [ ] Document recovery procedures

## Troubleshooting Deployment Issues

### MongoDB Connection Failed
```
Solution: Check connection string and network access
1. Verify MONGODB_URI format
2. Check IP whitelist (if using MongoDB Atlas)
3. Verify network connectivity
```

### CORS Errors
```
Solution: Update CORS configuration
1. Check FRONTEND_URL matches exactly
2. Include protocol (http/https)
3. Verify no trailing slashes
```

### High Memory Usage
```
Solution:
1. Increase Node.js memory limit
2. Enable clustering
3. Use PM2 with memory watch
```

### Slow Queries
```
Solution:
1. Add database indexes
2. Optimize queries
3. Implement caching
```

## Post-Deployment Checklist

- [ ] Test all authentication flows
- [ ] Verify HTTPS working
- [ ] Check API response times
- [ ] Monitor error logs
- [ ] Test backup/restore
- [ ] Verify email notifications (if configured)
- [ ] Test database failover
- [ ] Document deployment steps
- [ ] Create maintenance schedule
- [ ] Set up monitoring alerts

---

**For Production Deployment Support**: Contact the development team
