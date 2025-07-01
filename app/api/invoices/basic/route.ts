import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = lastInvoice ? 
      parseInt(lastInvoice.id.split('-')[0] || '0') + 1 : 1

    // Create invoice in database (without line_items and VeriFactu fields)
    const { line_items, ...invoiceDataWithoutLineItems } = invoiceData
    
    const invoice = {
      user_id: user.id,
      invoice_number: `${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`,
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

    return NextResponse.json({
      invoice: createdInvoice,
      message: 'Invoice created successfully (VeriFactu integration pending database migration)',
      note: 'Apply database migration to enable VeriFactu integration'
    })

  } catch (error: any) {
    console.error('Invoice creation error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to create invoice'
    }, { status: 500 })
  }
}