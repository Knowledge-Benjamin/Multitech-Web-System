# Multitech Business School - Modern SPA Platform

> A fully dynamic, production-ready single-page web application replacing legacy CMS/Joomla footprint

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + JavaScript (ES6+) + Plain CSS with CSS Variables
- **Backend**: Node.js + Express + RESTful API
- **Database**: PostgreSQL (Neon Cloud)
- **Security**: CORS, Helmet, Input Validation, Error Handling

### Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React Context (state management)
│   │   ├── styles/          # Global CSS with design tokens
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   ├── index.html           # HTML template
│   ├── vite.config.js       # Vite configuration
│   └── package.json         # Frontend dependencies
│
└── backend/
    ├── src/
    │   ├── routes/          # API endpoints
    │   ├── controllers/      # Business logic
    │   ├── models/          # Data models (future expansion)
    │   ├── middleware/      # Express middleware
    │   ├── config/          # Configuration files
    │   ├── utils/           # Helper functions
    │   ├── scripts/         # Database scripts
    │   └── server.js        # Server entry point
    ├── .env.example         # Environment template
    └── package.json         # Backend dependencies
```

## 🎨 Design System

### Color Palette
- **Primary Blue**: `#0052CC` - Main brand color
- **Secondary Navy**: `#1a2654` - Headlines & dark elements
- **Accent Yellow**: `#F4E4B3` - Call-to-action buttons
- **Accent Light Blue**: `#0099CC` - Secondary actions
- **Background**: `#FFFFFF` (white), `#F5F5F5` (light gray)

### Typography
- **Font Family**: System fonts (responsive, fast-loading)
- **Responsive Sizing**: Base 1rem scales dynamically on mobile
- **Weight Levels**: Light (300), Normal (400), Semibold (600), Bold (700)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon or self-hosted)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Access at: `http://localhost:5173`

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npm run migrate

# Seed sample data (optional)
npm run seed

# Start server
npm run dev
```

Server runs at: `http://localhost:3000`

## 📋 API Endpoints

### Programmes
- `GET /api/programmes` - List all programmes
- `GET /api/programmes?type=undergraduate` - Filter by type
- `GET /api/programmes/:id` - Get single programme
- `POST /api/programmes` - Create programme (admin)
- `PUT /api/programmes/:id` - Update programme (admin)
- `DELETE /api/programmes/:id` - Delete programme (admin)

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Submit application
- `GET /api/applications/:id` - Get single application
- `PUT /api/applications/:id/status` - Update status (admin)
- `DELETE /api/applications/:id` - Delete application (admin)

### Announcements
- `GET /api/announcements` - List announcements
- `GET /api/announcements?published=true` - Filter
- `POST /api/announcements` - Create (admin)
- `PUT /api/announcements/:id` - Update (admin)
- `DELETE /api/announcements/:id` - Delete (admin)

## 🔐 Security Features

✅ CORS Protection  
✅ Helmet Security Headers  
✅ Input Validation & Sanitization  
✅ Environment Variables (no hardcoded secrets)  
✅ Error Handling with generic messages  
✅ Database Connection Pooling  
✅ SSL/TLS for database (Neon)  

## 📊 Performance Optimization

- **Concurrency**: Connection pooling supports 2000+ concurrent interactions
- **Frontend**: Lazy loading, CSS minification, code splitting
- **Backend**: Query optimization with indexes, request caching
- **Database**: Connection pooling (max: 20 connections)

## 📝 Content Sections

### Home Page
- Hero banner with campus imagery
- Multi-section programme overview
- Call-to-action buttons
- Institutional messaging ("Why MBS")

### Programmes Page
- Filterable programme listings
- Undergraduate, Postgraduate, Diploma, Professional
- Dynamic filtering & search
- Application links

### Apply Page
- Multi-field application form
- Validation & error handling
- Success confirmation
- Email notification ready

### Navigation
- Sticky header with responsive design
- Mobile hamburger menu
- Quick access to key sections
- Campus selector (future enhancement)

## 🗄️ Database Schema

### programmes
- id, name, type, level, description, duration, capacity, tuition_fee
- Indexes on: type, active status

### applications
- id, first_name, last_name, email, phone, programme_id
- qualifications, additional_info, status
- Indexes on: status, email

### announcements
- id, title, content, campus, published
- Index on: published status

## 🛠️ Future Enhancements

- [ ] User Authentication & Admin Dashboard
- [ ] Email notifications for applications
- [ ] Student portal for application tracking
- [ ] Multi-campus support with selector
- [ ] Online payment integration
- [ ] Document upload for applications
- [ ] SMS notifications
- [ ] Advanced analytics & reporting
- [ ] Content Management System (CMS) for admins

## 📱 Responsive Design

✅ Mobile-first approach  
✅ Breakpoints: 768px, 1024px  
✅ Flexible grid layouts  
✅ Touch-friendly buttons (min 44px)  
✅ Readable font sizes on all devices  

## 🚦 Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-user
DB_PASSWORD=your-password
DB_SSL=true
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Multitech Business School
VITE_ENVIRONMENT=development
```

## 📞 Support & Contact

**Kampala Campus**  
Plot 345 Bukesa, off Sir Apollo Kaggwa Road  
P.O Box 3211 Kampala, Uganda  
Phone: +256 774 461 072 / +256 756 779 900  
Email: inquiries@multitech.ac.ug  

## 📄 License

© 2026 Multitech Business School. All Rights Reserved.

---

**Built with ❤️ for modern higher education**
