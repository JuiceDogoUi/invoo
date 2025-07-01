// API endpoint for syncing VeriFactu status
// POST /api/verifactu/sync - Sync all invoices for current user
// POST /api/verifactu/sync?invoice_id=xxx - Sync specific invoice

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VeriFactuStatusSync } from '@/lib/verifactu/status-sync'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const invoiceId = url.searchParams.get('invoice_id')

    const sync = new VeriFactuStatusSync(supabase)
    
    // Initialize VeriFactu client
    const clientInitialized = await sync.initializeClient(user.id)
    if (!clientInitialized) {
      return NextResponse.json({ 
        error: 'VeriFactu credentials not configured' 
      }, { status: 400 })
    }

    let results
    
    if (invoiceId) {
      // Sync specific invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('verifactu_uuid')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single()

      if (!invoice?.verifactu_uuid) {
        return NextResponse.json({ 
          error: 'Invoice not found or not submitted to VeriFactu' 
        }, { status: 404 })
      }

      const result = await sync.syncInvoiceStatus(invoiceId, invoice.verifactu_uuid)
      results = [result]
    } else {
      // Sync all user invoices
      results = await sync.syncAllUserInvoices(user.id)
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} invoices successfully`,
      results: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        details: results
      }
    })

  } catch (error: any) {
    console.error('VeriFactu sync error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to sync VeriFactu status'
    }, { status: 500 })
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get sync status for user's invoices
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        verifactu_status,
        verifactu_last_sync,
        verifactu_uuid
      `)
      .eq('user_id', user.id)
      .not('verifactu_uuid', 'is', null)
      .order('created_at', { desc: true })

    if (error) {
      throw error
    }

    const statusCounts = invoices.reduce((acc, invoice) => {
      const status = invoice.verifactu_status || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const lastSync = invoices
      .filter(i => i.verifactu_last_sync)
      .sort((a, b) => new Date(b.verifactu_last_sync).getTime() - new Date(a.verifactu_last_sync).getTime())[0]?.verifactu_last_sync

    return NextResponse.json({
      total_invoices: invoices.length,
      status_breakdown: statusCounts,
      last_sync: lastSync,
      invoices: invoices
    })

  } catch (error: any) {
    console.error('Failed to get sync status:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to get sync status'
    }, { status: 500 })
  }
}