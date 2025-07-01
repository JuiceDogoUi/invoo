# 🧪 VeriFactu Integration Testing Guide

## ✅ API Credentials Confirmed Working

**Your test credentials:**
- API Key: `vf_test_QcFzP3Y0pVCIj2SIlMIT7Nv2l8ebBU6gPvWJhzt9WzE=`
- Test NIF: `B75777847` (from VeriFactu response)
- Environment: `test`

## 🚀 How to Test the Complete Flow

### 1. Start the Application
```bash
npm run dev
```
Visit: http://localhost:3000

### 2. Configure VeriFactu Credentials
1. **Login/Register** in your app
2. Go to **Dashboard** → **Configuración** (Settings button)
3. Enter your credentials:
   - **NIF/CIF**: `B75777847`
   - **API Key**: `vf_test_QcFzP3Y0pVCIj2SIlMIT7Nv2l8ebBU6gPvWJhzt9WzE=`
4. Click **"Probar Conexión"** → Should show ✅ success

### 3. Test Invoice Creation
1. Go to **Dashboard** → **"Crear Nueva Factura"**
2. Fill out the form with **test data**:

```
Cliente:
- Nombre: Test Client SA
- Email: test@client.com
- Dirección: Calle Test 123, Madrid
- NIF/CIF: [Leave empty for F2 invoices]

Fechas:
- Fecha Emisión: 2025-01-01
- Vencimiento: 2025-01-31

Líneas:
- Descripción: Test Service
- Cantidad: 1
- Precio: 50.00€
- IVA: 21%
```

3. Click **"Crear Factura"**

### 4. Expected Results

**✅ Success Response:**
```json
{
  "invoice": { /* Invoice data */ },
  "verifactu": {
    "estado": "Pendiente",
    "uuid": "9aae380d-41bc-4398-b45d-e1808ff2a47a",
    "url": "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?...",
    "qr": "iVBORw0KGgoAAAANSUhEUgAAASIAAAEi..." // Base64 QR code
  }
}
```

## 📋 Testing Checklist

- [ ] API connection test passes ✅
- [ ] Invoice creation saves to database ✅
- [ ] VeriFactu submission works ✅
- [ ] QR code is generated ✅
- [ ] AEAT validation URL is provided ✅

## 🐛 Troubleshooting

### If you get NIF validation errors:
- Use **simplified invoices (F2)** under 3000€ without client NIF
- The test environment validates against real AEAT database

### Common test patterns:
```javascript
// F2 Invoice (simplified, no client NIF needed)
{
  total: < 3000,
  client_tax_id: "" // Empty for F2
}

// F1 Invoice (requires valid NIF)
{
  total: >= 3000,
  client_tax_id: "Valid Spanish NIF"
}
```

## 🎯 API Testing Results

**Health Check**: ✅ Working
```bash
curl -H "Authorization: Bearer vf_test_QcFzP3Y0pVCIj2SIlMIT7Nv2l8ebBU6gPvWJhzt9WzE=" \
     https://api.verifactu.com/verifactu/health
```

**Invoice Creation**: ✅ Working  
Successfully created test invoice with UUID and QR code.

## 🔗 Next Steps

1. Test the complete flow in your browser
2. Verify QR codes can be scanned/validated
3. Test different invoice types (F1, F2)
4. Test error handling with invalid data