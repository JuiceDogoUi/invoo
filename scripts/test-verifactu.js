#!/usr/bin/env node

// Test script for VeriFactu API
const API_KEY = 'vf_test_QcFzP3Y0pVCIj2SIlMIT7Nv2l8ebBU6gPvWJhzt9WzE='
const TEST_NIF = '12345678Z' // Common test NIF
const BASE_URL = 'https://api.verifactu.com/verifactu'

async function testVeriFactuAPI() {
  console.log('🧪 Testing VeriFactu API Connection...\n')

  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...')
    const healthResponse = await fetch(`${BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`   Status: ${healthResponse.status}`)
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json()
      console.log('   ✅ Health check successful')
      console.log('   Response:', JSON.stringify(healthData, null, 2))
    } else {
      const errorData = await healthResponse.text()
      console.log('   ❌ Health check failed')
      console.log('   Error:', errorData)
      return
    }

    console.log('\n2. Testing invoice creation...')
    
    // Test 2: Create Invoice
    const testInvoice = {
      serie: '2025',
      numero: '1',
      fecha_expedicion: '01-01-2025',
      tipo_factura: 'F1',
      descripcion: 'Test invoice from Invoo.es',
      nif: '87654321B', // Test client NIF
      nombre: 'Test Client',
      nif_emisor: TEST_NIF,
      lineas: [
        {
          base_imponible: 100.00,
          tipo_impositivo: 21,
          cuota_repercutida: 21.00,
          descripcion: 'Test product',
          cantidad: 1,
          precio_unitario: 100.00
        }
      ],
      importe_total: 121.00
    }

    const invoiceResponse = await fetch(`${BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testInvoice)
    })

    console.log(`   Status: ${invoiceResponse.status}`)
    
    if (invoiceResponse.ok) {
      const invoiceData = await invoiceResponse.json()
      console.log('   ✅ Invoice creation successful')
      console.log('   Response:', JSON.stringify(invoiceData, null, 2))
    } else {
      const errorData = await invoiceResponse.text()
      console.log('   ❌ Invoice creation failed')
      console.log('   Error:', errorData)
      
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.errors) {
          console.log('   Detailed errors:')
          errorJson.errors.forEach((error, index) => {
            console.log(`     ${index + 1}. ${error.message} (${error.code})`)
          })
        }
      } catch (e) {
        // Error response is not JSON
      }
    }

  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
}

testVeriFactuAPI()