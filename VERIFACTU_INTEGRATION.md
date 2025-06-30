# VeriFactu Integration Guide

## 📋 Overview

Complete integration with VeriFactu API for Spanish invoice compliance, including TicketBAI support for Basque Country.

## 🔧 Configuration

### Environment Variables Required

```bash
# VeriFactu API
VERIFACTU_API_KEY=your_test_api_key
VERIFACTU_PRODUCTION_API_KEY=your_production_api_key
COMPANY_NIF=12345678A  # Your company's NIF
```

### Getting VeriFactu API Key

1. Visit [VeriFacti.com](https://www.verifacti.com)
2. Create account (free test account included)
3. Get API key from dashboard
4. Each NIF has its own API key

## 🎯 Supported Features

### VeriFactu Standard
- ✅ **Invoice Creation** (`/verifactu/create`)
- ✅ **Invoice Modification** (`/verifactu/modify`)
- ✅ **Invoice Cancellation** (`/verifactu/cancel`)
- ✅ **Status Checking** (`/verifactu/status`)
- ✅ **NIF Management** (activate/deactivate)

### TicketBAI (Basque Country)
- ✅ **TicketBAI Creation** (`/ticketbai/create`)
- ✅ **Province Support** (Álava, Guipúzcoa, Vizcaya)
- ✅ **Digital Certificates** handling
- ✅ **XML Generation** and signing

### Invoice Types
- ✅ **F1**: Standard invoice (requires recipient NIF)
- ✅ **F2**: Simplified invoice (< 3,000€, no NIF required)
- ✅ **F3**: Summary invoice
- ✅ **R1-R5**: Rectification invoices

## 📊 Spanish Tax Compliance

### Tax Rates (IVA)
- **21%** (S1): Standard rate
- **10%** (S2): Reduced rate
- **4%** (S3): Super-reduced rate
- **0%** (E): Exempt

### Tax ID Validation
- **NIF**: Spanish nationals (12345678A)
- **NIE**: Foreigners (X1234567A)
- **CIF**: Companies (A12345678)

## 🔍 Usage Examples

### Basic Invoice Creation

```typescript
import { veriFactuAPI } from '@/verifactu-api'
import { validateSpanishTaxId } from '@/lib/spanish-tax-validation'

// Validate client tax ID
const validation = validateSpanishTaxId('12345678A')
if (!validation.isValid) {
  throw new Error(`Invalid tax ID: ${validation.errors.join(', ')}`)
}

// Create invoice
const invoice = {
  id: 'uuid',
  user_id: 'user-uuid',
  invoice_number: 'A-001',
  client_name: 'Cliente Ejemplo',
  client_tax_id: '12345678A',
  client_address: 'Calle Ejemplo 123, Madrid',
  issue_date: '2024-01-15',
  total: 121.00,
  line_items: [{
    description: 'Servicio de consultoría',
    quantity: 1,
    unit_price: 100.00,
    tax_rate: 21,
    total: 121.00
  }]
}

// Validate before submission
const errors = veriFactuAPI.validateInvoiceData(invoice)
if (errors.length > 0) {
  throw new Error(`Validation errors: ${errors.join(', ')}`)
}

// Submit to VeriFactu
const response = await veriFactuAPI.signInvoice(invoice)
console.log('QR Code:', response.qr_code_url)
console.log('Hash:', response.hash)
```

### TicketBAI (Basque Country)

```typescript
// For Basque Country clients
const ticketResponse = await veriFactuAPI.createTicketBAI(
  veriFactuInvoice,
  'vizcaya' // or 'alava', 'guipuzcoa'
)
```

### Simplified vs Standard Invoices

```typescript
// Automatic detection based on amount and client data
// F2 (Simplified): < 3,000€ and no client NIF
// F1 (Standard): ≥ 3,000€ or has client NIF

const invoiceType = veriFactuAPI.determineInvoiceType(invoice)
// Returns: 'F1' or 'F2'
```

## ⚠️ Important Validation Rules

### VeriFactu Specific Requirements

1. **Serie Format**: Alphanumeric, max 20 characters
2. **Numero Range**: 1 to 99,999,999
3. **Line Items**: Max 12 per invoice
4. **Total Difference**: Line items can differ by ~50€ from total
5. **Simplified Limit**: F2 invoices must be < 3,000€
6. **Tax ID Required**: F1 invoices must have client tax ID

### Chain Validation
- VeriFactu handles automatic chain validation
- No need for manual hash linking
- Non-consecutive invoice creation allowed

## 🔄 Error Handling

```typescript
try {
  const response = await veriFactuAPI.signInvoice(invoice)
} catch (error) {
  if (error instanceof VeriFactuAPIError) {
    console.error('VeriFactu Error:', error.errorCode)
    console.error('Message:', error.message)
    console.error('Details:', error.details)
  }
}
```

### Common Error Codes
- **400**: Validation errors
- **401**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Server error

## 🚀 Production Deployment

### Prerequisites
1. **Production API Key**: Get from VeriFactu dashboard
2. **NIF Activation**: Must be activated before first use
3. **Tax Authority Registration**: Ensure AEAT compliance

### Environment Setup
```bash
NODE_ENV=production
VERIFACTU_API_KEY=prod_key_here
COMPANY_NIF=your_real_nif
```

### Testing Checklist
- [ ] Test API key works
- [ ] NIF is activated
- [ ] Invoice validation passes
- [ ] QR codes generate correctly
- [ ] Error handling works
- [ ] TicketBAI (if Basque Country)

## 📚 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/verifactu/create` | POST | Create new invoice |
| `/verifactu/modify` | POST | Modify existing invoice |
| `/verifactu/cancel` | POST | Cancel invoice |
| `/verifactu/status` | GET | Check invoice status |
| `/ticketbai/create` | POST | Create TicketBAI |
| `/nif/activate` | POST | Activate NIF |
| `/nif/deactivate` | POST | Deactivate NIF |

## 🎯 Next Steps

1. **Get VeriFactu Account**: Sign up at verifacti.com
2. **Test Integration**: Use test API key
3. **Production Setup**: Get production key and activate NIF
4. **UI Integration**: Build invoice creation forms
5. **PDF Generation**: Add QR codes to invoice PDFs

## 📞 Support

- **VeriFactu Docs**: https://www.verifacti.com/docs
- **Developer Portal**: https://www.verifacti.com/desarrolladores
- **API Examples**: https://www.verifacti.com/desarrolladores/ejemplos