import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VeriFactuClient, convertToVeriFactuInvoice } from '@/lib/verifactu/client'
import { mapVeriFactuApiStatus, type VeriFactuStatus } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const invoiceData = await request.json()

    // Get user's profile for VeriFactu credentials
    const { data: profile } = await supabase
      .from('profiles')
      .select('verifactu_api_key, tax_id')
      .eq('id', user.id)
      .single()

    // Generate invoice number if not provided - fix for serie-specific numbering
    const currentYear = new Date().getFullYear().toString()
    const serie = `INV${currentYear}` // Use unique serie prefix to avoid conflicts
    
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('numero')
      .eq('user_id', user.id)
      .eq('serie', serie) // Fix: Query by serie to avoid conflicts
      .order('numero', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (lastInvoice?.numero || 0) + 1

    // Create invoice in database (without line_items)
    const { line_items, ...invoiceDataWithoutLineItems } = invoiceData
    
    const invoice = {
      user_id: user.id,
      invoice_number: `${serie}-${nextNumber.toString().padStart(4, '0')}`,
      serie: serie,
      numero: nextNumber,
      status: 'draft',
      ...invoiceDataWithoutLineItems
    }

    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single()

    if (invoiceError) {
      throw new Error(`Database error: ${invoiceError.message}`)
    }

    // Create line items separately
    if (line_items && line_items.length > 0) {
      const lineItemsToInsert = line_items.map((item: any) => ({
        invoice_id: createdInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        total: item.total
      }))

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)

      if (lineItemsError) {
        // If line items fail, we should clean up the invoice
        await supabase.from('invoices').delete().eq('id', createdInvoice.id)
        throw new Error(`Line items error: ${lineItemsError.message}`)
      }
    }

    // Try to submit to VeriFactu if credentials are available
    let verifactuResult = null
    if (profile?.verifactu_api_key && profile?.tax_id) {
      try {
        const client = new VeriFactuClient(profile.verifactu_api_key, profile.tax_id, false)
        
        // Get line items for VeriFactu conversion
        const { data: lineItems } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', createdInvoice.id)

        const invoiceWithLineItems = {
          ...createdInvoice,
          line_items: lineItems || []
        }
        
        const verifactuInvoice = convertToVeriFactuInvoice(invoiceWithLineItems, profile.tax_id)
        
        // Debug: Log the data being sent to VeriFactu
        console.log('=== SENDING TO VERIFACTU ===')
        console.log('Invoice data:', JSON.stringify(verifactuInvoice, null, 2))
        console.log('Line items count:', verifactuInvoice.lineas?.length || 0)
        console.log('Client name:', verifactuInvoice.nombre)
        console.log('Description:', verifactuInvoice.descripcion)
        console.log('Total amount:', verifactuInvoice.importe_total)
        
        verifactuResult = await client.createInvoice(verifactuInvoice)

        // Map the Spanish API response to internal status
        const mappedStatus = mapVeriFactuApiStatus(verifactuResult.estado || verifactuResult.status || 'pending')
        
        console.log('VeriFactu API Response Status:', verifactuResult.estado || verifactuResult.status)
        console.log('Mapped to internal status:', mappedStatus)

        // Update invoice with VeriFactu data
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            verifactu_id: verifactuResult.uuid || verifactuResult.id,
            verifactu_uuid: verifactuResult.uuid,
            verifactu_hash: verifactuResult.hash,
            verifactu_signature: verifactuResult.signature,
            qr_code_data: verifactuResult.qr || verifactuResult.qr_code_url,
            verifactu_status: mappedStatus,
            verifactu_last_sync: new Date().toISOString(),
            status: mappedStatus === 'accepted' ? 'submitted' : 'pending'
          })
          .eq('id', createdInvoice.id)

        if (updateError) {
          console.error('Failed to update invoice with VeriFactu data:', updateError)
        }

      } catch (verifactuError: any) {
        console.error('VeriFactu submission failed:', verifactuError)
        
        // Update invoice with error info
        await supabase
          .from('invoices')
          .update({
            last_submission_error: verifactuError.message,
            submission_retry_count: 1
          })
          .eq('id', createdInvoice.id)
      }
    }

    return NextResponse.json({
      invoice: createdInvoice,
      verifactu: verifactuResult,
      message: verifactuResult 
        ? 'Invoice created and submitted to VeriFactu successfully'
        : 'Invoice created (VeriFactu credentials not configured)'
    })

  } catch (error: any) {
    console.error('Invoice creation error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to create invoice'
    }, { status: 500 })
  }
}