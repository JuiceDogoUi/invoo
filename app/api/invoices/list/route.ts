import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    // Build query
    let query = supabase
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invoices, error: invoicesError } = await query

    if (invoicesError) {
      throw new Error(`Database error: ${invoicesError.message}`)
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      throw new Error(`Count error: ${countError.message}`)
    }

    return NextResponse.json({
      invoices,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('Invoice list error:', error)
    
    return NextResponse.json({
      error: error.message || 'Failed to fetch invoices'
    }, { status: 500 })
  }
}