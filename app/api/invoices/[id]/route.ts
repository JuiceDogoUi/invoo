import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // First, delete the line items
    const { error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', resolvedParams.id)

    if (lineItemsError) {
      throw new Error(`Failed to delete line items: ${lineItemsError.message}`)
    }

    // Then delete the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (invoiceError) {
      throw new Error(`Failed to delete invoice: ${invoiceError.message}`)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Invoice deletion error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to delete invoice'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const {
      client_name,
      client_tax_id,
      client_address,
      client_email,
      notes,
      subtotal,
      tax_amount,
      total,
      line_items
    } = body

    // Update invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        client_name,
        client_tax_id,
        client_address,
        client_email,
        notes,
        subtotal,
        tax_amount,
        total,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)

    if (invoiceError) {
      throw new Error(`Failed to update invoice: ${invoiceError.message}`)
    }

    // Delete existing line items
    const { error: deleteError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', resolvedParams.id)

    if (deleteError) {
      throw new Error(`Failed to delete line items: ${deleteError.message}`)
    }

    // Insert new line items
    if (line_items && line_items.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(
          line_items.map((item: any) => ({
            invoice_id: resolvedParams.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            total: item.total
          }))
        )

      if (lineItemsError) {
        throw new Error(`Failed to insert line items: ${lineItemsError.message}`)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Invoice update error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to update invoice'
    }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get invoice with line items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(
          id,
          description,
          quantity,
          unit_price,
          tax_rate,
          total
        )
      `)
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ invoice })

  } catch (error: any) {
    console.error('Invoice fetch error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to fetch invoice'
    }, { status: 500 })
  }
}