# Backend Deployment Guide

## 🚀 Quick Setup (From This Folder)

### Step 1: Move to Separate Location

```powershell
# From pharmacy-standalone-pos directory
cd ..
Move-Item -Path "pharmacy-standalone-pos\backend-project" -Destination "pharmacy-pos-backend"
cd pharmacy-pos-backend
```

### Step 2: Install Dependencies

```powershell
npm install
```

### Step 3: Configure Environment

```powershell
# Copy example environment file
Copy-Item .env.example .env

# Edit .env with your settings
notepad .env
```

**Required settings in `.env`:**

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pharmacy_pos
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=change-this-to-a-random-secure-string
CORS_ORIGIN=http://localhost:5173
```

### Step 4: Create Database

```powershell
npm run db:create
```

### Step 5: Sync Database Tables

```powershell
npm run db:sync
```

### Step 6: Seed Initial Data

```powershell
npm run db:seed
```

This creates:

- Admin user (username: `admin`, password: `admin123`)
- Sample categories and product types
- Sample supplier

### Step 7: Start Server

```powershell
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

Server will run on: `http://localhost:3000`

---

## 🧪 Testing the API

### Using PowerShell:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:3000/api/health" | Select-Object -ExpandProperty Content

# Login
$body = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token

# Get products (with token)
$headers = @{
    Authorization = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/products" -Headers $headers
```

### Using cURL (Git Bash):

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get products (replace TOKEN with actual token)
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN"
```

---

## 📁 Git Repository Setup

```powershell
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial backend setup"

# Add remote repository
git remote add origin <your-github-repo-url>

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🐳 Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_NAME=pharmacy_pos
      - DB_USER=root
      - DB_PASSWORD=root123
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root123
      - MYSQL_DATABASE=pharmacy_pos
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

Run with Docker:

```powershell
docker-compose up -d
```

---

## 🌐 Production Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
# heroku login

# Create app
heroku create pharmacy-pos-api

# Add MySQL addon
heroku addons:create jawsdb:kitefin

# Set environment variables
heroku config:set JWT_SECRET=your-secret-key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Run database sync
heroku run npm run db:sync
heroku run npm run db:seed
```

### Option 2: Railway

1. Create account at railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your backend repository
4. Add MySQL database
5. Set environment variables
6. Deploy automatically

### Option 3: DigitalOcean / AWS EC2

1. Create a Ubuntu server
2. Install Node.js and MySQL
3. Clone repository
4. Install dependencies
5. Use PM2 for process management:

```bash
# Install PM2
npm install -g pm2

# Start app
pm2 start src/index.js --name pharmacy-api

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

6. Setup Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change JWT_SECRET to a strong random string (at least 64 characters)
- [ ] Change default admin password after first login
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS (use Let's Encrypt)
- [ ] Restrict CORS to your frontend domain only
- [ ] Set up database backups
- [ ] Enable API rate limiting (install `express-rate-limit`)
- [ ] Set up monitoring (install `@sentry/node`)
- [ ] Configure firewall rules
- [ ] Keep dependencies updated (`npm audit`)

---

## 📊 Monitoring & Logs

### View logs with PM2:

```bash
pm2 logs pharmacy-api
pm2 logs pharmacy-api --lines 100
```

### Check status:

```bash
pm2 status
pm2 monit
```

---

## 🔄 Updating the Backend

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart server
pm2 restart pharmacy-api

# Or with npm
npm run dev
```

---

## 🆘 Troubleshooting

### Server won't start

1. Check if port 3000 is already in use:

   ```powershell
   netstat -ano | findstr :3000
   ```

2. Check database connection:
   - Verify MySQL is running
   - Check credentials in `.env`
   - Test connection manually

### Can't connect from frontend

1. Check CORS settings in `.env`
2. Ensure `CORS_ORIGIN` includes your frontend URL
3. Check if server is running: `http://localhost:3000/api/health`

### Database errors

1. Run migrations: `npm run db:sync`
2. Check MySQL version (needs 8.0+)
3. Verify database exists: `npm run db:create`

---

## 📞 Support

For issues or questions:

1. Check logs: `npm run dev` (shows detailed errors)
2. Verify environment variables
3. Test endpoints with Postman
4. Check database connectivity

---

## ✅ Final Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env` file)
- [ ] Database created (`npm run db:create`)
- [ ] Tables synced (`npm run db:sync`)
- [ ] Data seeded (`npm run db:seed`)
- [ ] Server starts successfully (`npm run dev`)
- [ ] Can login with admin credentials
- [ ] API endpoints responding correctly
- [ ] Frontend can connect to backend

**Ready to deploy!** 🚀
