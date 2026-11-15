# Deployment Guide

## Production Deployment Checklist

### Frontend (Vite)

1. **Build for Production**
```bash
npm run build
```

2. **Deployment Options**
   - Vercel (recommended - zero config)
   - Netlify
   - AWS S3 + CloudFront
   - Firebase Hosting
   - Traditional web server (nginx, Apache)

3. **Update Environment Variables**
```env
VITE_API_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### Backend (Node.js)

1. **Deployment Options**
   - Render.com (recommended - free tier available)
   - Railway.app
   - AWS EC2 + RDS
   - Heroku
   - DigitalOcean App Platform
   - Traditional VPS (DigitalOcean, Linode, AWS Lightsail)

### NTAG 424 DNA phone-tap verification

The NFC verification route accepts NTAG 424 DNA Secure Dynamic Messaging (SUN)
data at `/verify/nfc?p=...&c=...`. Personalized tags must place the encrypted
PICC data in `p` and the SUN MAC in `c`; the MAC input window must match the
empty-window configuration expected by the verifier.

The backend requires `NTAG424_ISSUER_KEY` as a 32-character hexadecimal
AES-128 key. Store it only as a production secret (for example, a Render
environment secret); never commit it to source control or expose it to the
frontend. The verifier checks the SUN MAC and rejects reused counters.

This implements tap verification only. The application does not yet provision
or enroll physical tags, and it has not been validated against personalized
NTAG 424 DNA hardware. Do not enable it for production credentials until the
key derivation and tag configuration have been confirmed with the selected
personalization equipment and physical-card tests have passed.

2. **Security Hardening**
```javascript
// Update server.js for production:
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  strictTransportSecurity: { maxAge: 31536000 }
}))
```

3. **Database**
   - Currently using Neon (PostgreSQL)
   - Ensure SSL connections (already configured)
   - Regular backups enabled
   - Connection pooling optimized for production

4. **Performance**
   - Enable gzip compression
   - Set proper cache headers
   - Implement rate limiting
   - Use CDN for static assets

### Pre-Deployment Checklist

- [ ] Update environment variables
- [ ] Run security audit: `npm audit`
- [ ] Test all API endpoints
- [ ] Test form submissions
- [ ] Verify email notifications
- [ ] Check responsive design on mobile
- [ ] Test database backups
- [ ] Set up monitoring & logging
- [ ] Configure SSL certificates
- [ ] Enable HTTPS
- [ ] Set up CI/CD pipeline

### Monitoring & Logging

1. **Error Tracking**: Sentry, LogRocket
2. **Application Monitoring**: New Relic, Datadog
3. **Uptime Monitoring**: Uptime Robot, StatusPage
4. **Database**: Neon dashboard built-in monitoring

### Scaling Considerations

For 2000+ concurrent users:

1. **Frontend Caching**
   - Service Workers
   - CDN caching
   - Browser caching headers

2. **Backend Scaling**
   - Load balancer (nginx, HAProxy)
   - Horizontal scaling (multiple Node instances)
   - Rate limiting per IP
   - Request queuing

3. **Database**
   - Read replicas for reporting
   - Connection pool optimization
   - Query optimization
   - Regular maintenance

4. **Infrastructure**
   - Auto-scaling groups
   - Containerization (Docker)
   - Kubernetes for orchestration
   - CDN for static content

### Disaster Recovery

- Daily automated backups
- Backup retention: 30 days
- Test restore procedures monthly
- Document recovery steps
- Maintain DNS failover setup
