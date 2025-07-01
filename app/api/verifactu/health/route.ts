import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VeriFactuClient } from '@/lib/verifactu/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's VeriFactu credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verifactu_api_key, tax_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.verifactu_api_key || !profile.tax_id) {
      return NextResponse.json({ 
        error: 'VeriFactu API key or NIF not configured',
        needsSetup: true 
      }, { status: 400 })
    }

    // Test VeriFactu API connection
    const client = new VeriFactuClient(profile.verifactu_api_key, profile.tax_id, false)
    const healthResult = await client.healthCheck()

    return NextResponse.json({
      status: 'success',
      verifactu: healthResult,
      message: 'VeriFactu API connection successful'
    })

  } catch (error: any) {
    console.error('VeriFactu health check error:', error)
    
    return NextResponse.json({
      status: 'error',
      error: error.message || 'VeriFactu API connection failed',
      details: error.errors || []
    }, { status: 500 })
  }
}