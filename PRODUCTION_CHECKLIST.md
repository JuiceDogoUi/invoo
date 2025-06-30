# 🚀 Production Deployment Checklist

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration (PRODUCTION)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# VeriFactu API Configuration (PRODUCTION)
VERIFACTU_API_KEY=your_production_verifactu_api_key
COMPANY_NIF=your_real_company_nif
WEBHOOK_SECRET=your_secure_webhook_secret

# App Configuration (PRODUCTION)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

## Pre-Deployment Checks

### ✅ Security
- [ ] Environment variables configured securely
- [ ] No test API keys in production
- [ ] HTTPS enforced
- [ ] Supabase RLS policies enabled
- [ ] Database migrations applied

### ✅ VeriFactu Integration
- [ ] Production VeriFactu API key configured
- [ ] Real company NIF validated
- [ ] Webhook endpoints configured
- [ ] QR code generation tested
- [ ] Invoice chain tracking verified

### ✅ Database
- [ ] Supabase production database ready
- [ ] All migrations applied successfully
- [ ] Row Level Security enabled
- [ ] Performance indexes created
- [ ] Backup strategy configured

### ✅ Monitoring
- [ ] Health monitoring endpoints configured
- [ ] Error tracking set up
- [ ] Performance monitoring enabled
- [ ] Circuit breaker thresholds configured
- [ ] Rate limiting configured

### ✅ Testing
- [ ] All tests passing
- [ ] TypeScript compilation clean
- [ ] ESLint warnings resolved
- [ ] Production build successful
- [ ] Manual QA completed

## Deployment Steps

### 1. Vercel Deployment (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Configure environment variables in Vercel dashboard
# Add production environment variables
```

### 2. Custom Server Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### 3. Docker Deployment

```bash
# Build Docker image
docker build -t invoo-es .

# Run container
docker run -p 3000:3000 --env-file .env.local invoo-es
```

## Post-Deployment Verification

### ✅ Application Health
- [ ] Homepage loads correctly
- [ ] Authentication flow works
- [ ] Dashboard accessible
- [ ] VeriFactu API responding
- [ ] Database connections healthy

### ✅ VeriFactu Compliance
- [ ] Test invoice creation successful
- [ ] QR code generation working
- [ ] Compliance text appears correctly
- [ ] AEAT submission tested
- [ ] Webhook notifications received

### ✅ Performance
- [ ] Page load times acceptable (<3s)
- [ ] API response times healthy (<1s)
- [ ] Database queries optimized
- [ ] CDN configured for static assets
- [ ] Monitoring dashboards active

## Emergency Procedures

### Circuit Breaker Activation
```javascript
// Emergency shutdown if needed
masterVeriFactuClient.emergencyShutdown()
```

### Health Check Endpoint
```
GET /api/health
```

### Database Migration Rollback
```sql
-- If needed, rollback latest migration
-- Ensure data integrity before rollback
```

## Support Contacts

- **Technical Lead**: [Your Email]
- **VeriFactu Support**: support@verifacti.com
- **Supabase Support**: https://supabase.com/support
- **AEAT Tax Authority**: [Spanish Tax Office]

## Compliance Notes

This application is designed for full compliance with:
- **Spanish VeriFactu Law** (Royal Decree 1007/2023)
- **AEAT Technical Specifications** (HAC/1177/2024)
- **TicketBAI** (Basque Country requirements)
- **Spanish Anti-Fraud Law**

⚠️ **Important**: This application handles sensitive tax data. Ensure all security measures are properly implemented before production deployment.

✅ **Production Ready**: This checklist confirms enterprise-grade deployment readiness for Spanish freelancers and small businesses.