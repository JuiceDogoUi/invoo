# Invoo.es - Facturación VeriFactu para Autónomos

SaaS web app for Spanish freelancers to create, digitally sign, and submit invoices via Spain's VeriFactu system.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   └── ui/               # Reusable UI components
├── lib/                  # Utilities and configurations
│   ├── supabase/         # Supabase client setup
│   └── utils.ts          # Utility functions
├── supabase/             # Database migrations
├── types/                # TypeScript type definitions
└── verifactu-api/        # VeriFactu API integration
```

## ✅ Current Features

- ✅ Next.js 15 with App Router
- ✅ TypeScript & Tailwind CSS
- ✅ Supabase authentication (magic link)
- ✅ Protected dashboard with middleware
- ✅ Responsive UI components
- ✅ Spanish localization

## 🚧 Roadmap

- 🚧 Invoice creation & management UI
- ✅ VeriFactu API integration (authentication, signing, validation)
- ✅ Spanish tax ID validation (NIF, NIE, CIF)
- ✅ Invoice type management (F1, F2, R1-R5, F3)
- ✅ AEAT compliance structure
- 🚧 PDF generation with QR codes
- 🚧 Stripe payment integration
- 🚧 Billing limits (5 free invoices/month)

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + Database)
- **Payments:** Stripe
- **VeriFactu:** Fiskaly/Invopop API
- **Deployment:** Vercel

## 📝 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checker
```

## 🔧 Environment Variables

Required environment variables (see `.env.local.example`):

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**VeriFactu API:**
- `VERIFACTU_API_KEY` - VeriFactu test API key
- `VERIFACTU_PRODUCTION_API_KEY` - VeriFactu production API key
- `VERIFACTU_TEST_URL` - Test environment URL
- `VERIFACTU_PRODUCTION_URL` - Production environment URL

**Stripe (Future):**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key

## 📄 License

Private project for Invoo.es SaaS application.