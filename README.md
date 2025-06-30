# 🚀 Invoo.es - Bulletproof VeriFactu SaaS Platform

Enterprise-grade SaaS platform for Spanish autónomos to create, manage, and digitally sign invoices for submission to Spain's AEAT tax authority under the VeriFactu law.

## ⚡ Quick Start

```bash
# Start development server
./scripts/dev.sh

# Preview landing page
./scripts/preview-landing.sh

# Run tests
./scripts/test.sh
```

## 🏗️ Architecture

- **Next.js 15** with App Router + TypeScript
- **Supabase** authentication and database
- **Bulletproof VeriFactu API** integration
- **Enterprise safeguards** with monitoring
- **Spanish tax compliance** (100% compliant)

## 📁 Project Structure

```
├── app/                    # 🌐 Next.js SaaS Application
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── ...
├── landing/               # 🎨 Marketing Landing Page
│   ├── index.html         # Landing page
│   ├── style.css          # Styling
│   └── script.js          # Functionality
├── components/            # ⚛️ React Components
├── verifactu-api/         # 🇪🇸 VeriFactu Integration
│   ├── bulletproof-client.ts     # Enterprise API client
│   ├── master-client.ts          # Complete integration
│   ├── production-safeguards.ts  # Monitoring & safety
│   └── ...
├── supabase/              # 🗄️ Database
│   └── migrations/        # Database schema
├── scripts/               # 🔧 Development Scripts
│   ├── dev.sh            # Start development
│   ├── test.sh           # Run tests
│   └── preview-landing.sh # Preview landing
└── docs/                  # 📚 Documentation
```

## 🇪🇸 VeriFactu Features

### ✅ **Complete Compliance**
- **All invoice types**: F1, F2, F3, R1-R5
- **Spanish tax rates**: 0%, 4%, 10%, 21%
- **TicketBAI support**: Basque Country compliance
- **QR code generation**: AEAT verification
- **Real-time submission**: Automatic AEAT delivery

### ✅ **Enterprise Grade**
- **Bulletproof error handling** with retry logic
- **Production safeguards** with circuit breakers
- **Invoice chain tracking** for audit compliance
- **Real-time monitoring** and health checks
- **Webhook integration** for status updates

## 🚀 Development

### **Start Development Server**
```bash
./scripts/dev.sh
# Opens: http://localhost:3000
```

### **Preview Landing Page**
```bash
./scripts/preview-landing.sh
# Opens: http://localhost:8000
```

### **Run Quality Checks**
```bash
./scripts/test.sh
# Runs: TypeScript, ESLint, Build tests
```

## 🌐 Deployment

### **Landing Page**
Upload `landing/` folder contents to your web server.

### **SaaS Application**
Deploy to Vercel/Netlify with environment variables configured.

## 📊 Status

- ✅ **Landing Page**: Production ready
- ✅ **VeriFactu Integration**: 100% compliant
- ✅ **Database Schema**: Enterprise complete
- ✅ **Authentication**: Supabase magic links
- ✅ **Dashboard**: Real-time statistics
- 🔄 **Production Deployment**: In progress

## 🔗 Links

- **Repository**: https://github.com/JuiceDogoUi/invoo.git
- **Landing Page**: Upload to invoo.es
- **Documentation**: See `docs/` folder

---

**Ready for Spanish freelancers!** 🇪🇸⚡