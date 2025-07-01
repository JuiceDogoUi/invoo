// VeriFactu Status Sync Utility
// Handles syncing invoice statuses between our database and Verifacti API

import { createClient } from '@/lib/supabase/server'
import { VeriFactuClient } from './client'
import { mapVeriFactuApiStatus, type VeriFactuStatus } from '@/types'

export interface VeriFactuStatusSyncResult {
  invoice_id: string
  previous_status: VeriFactuStatus | null
  new_status: VeriFactuStatus
  synced_at: string
  success: boolean
  error?: string
}

export class VeriFactuStatusSync {
  private supabase: any
  private verifactuClient: VeriFactuClient | null = null

  constructor(supabase: any) {
    this.supabase = supabase
  }

  // Initialize VeriFactu client with user credentials
  async initializeClient(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('verifactu_api_key, tax_id')
        .eq('id', userId)
        .single()

      if (profile?.verifactu_api_key && profile?.tax_id) {
        this.verifactuClient = new VeriFactuClient(profile.verifactu_api_key, profile.tax_id, false)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to initialize VeriFactu client:', error)
      return false
    }
  }

  // Sync status for a single invoice by UUID
  async syncInvoiceStatus(invoiceId: string, verifactuUuid: string): Promise<VeriFactuStatusSyncResult> {
    const result: VeriFactuStatusSyncResult = {
      invoice_id: invoiceId,
      previous_status: null,
      new_status: 'error' as VeriFactuStatus,
      synced_at: new Date().toISOString(),
      success: false
    }

    try {
      if (!this.verifactuClient) {
        throw new Error('VeriFactu client not initialized')
      }

      // Get current status from database
      const { data: invoice } = await this.supabase
        .from('invoices')
        .select('verifactu_status')
        .eq('id', invoiceId)
        .single()

      result.previous_status = invoice?.verifactu_status || null

      // Query Verifacti API for current status
      const apiResponse = await this.verifactuClient.getInvoiceStatus(verifactuUuid)
      
      // Map Spanish API response to internal status
      const newStatus = mapVeriFactuApiStatus(apiResponse.estado || apiResponse.status || 'pending')
      result.new_status = newStatus

      // Update database if status changed
      if (result.previous_status !== newStatus) {
        const { error: updateError } = await this.supabase
          .from('invoices')
          .update({
            verifactu_status: newStatus,
            verifactu_last_sync: result.synced_at,
            // Update main invoice status based on VeriFactu status
            status: this.mapToInvoiceStatus(newStatus)
          })
          .eq('id', invoiceId)

        if (updateError) {
          throw updateError
        }

        console.log(`✅ Synced invoice ${invoiceId}: ${result.previous_status} → ${newStatus}`)
      } else {
        console.log(`ℹ️  Invoice ${invoiceId} status unchanged: ${newStatus}`)
      }

      result.success = true
      return result

    } catch (error: any) {
      result.error = error.message
      console.error(`❌ Failed to sync invoice ${invoiceId}:`, error.message)
      return result
    }
  }

  // Sync all pending invoices for a user
  async syncAllUserInvoices(userId: string): Promise<VeriFactuStatusSyncResult[]> {
    const results: VeriFactuStatusSyncResult[] = []

    try {
      // Initialize client
      const clientInitialized = await this.initializeClient(userId)
      if (!clientInitialized) {
        throw new Error('Failed to initialize VeriFactu client')
      }

      // Get all invoices with VeriFactu IDs that need syncing
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('id, verifactu_uuid, verifactu_status, verifactu_last_sync')
        .eq('user_id', userId)
        .not('verifactu_uuid', 'is', null)
        .in('verifactu_status', ['pending', 'processing']) // Only sync non-final statuses
        .order('created_at', { desc: true })

      if (error) {
        throw error
      }

      console.log(`🔄 Syncing ${invoices.length} invoices for user ${userId}`)

      // Sync each invoice
      for (const invoice of invoices) {
        const result = await this.syncInvoiceStatus(invoice.id, invoice.verifactu_uuid)
        results.push(result)

        // Add small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const successCount = results.filter(r => r.success).length
      console.log(`✅ Successfully synced ${successCount}/${results.length} invoices`)

      return results

    } catch (error: any) {
      console.error('❌ Failed to sync user invoices:', error.message)
      throw error
    }
  }

  // Map VeriFactu status to main invoice status
  private mapToInvoiceStatus(verifactuStatus: VeriFactuStatus): string {
    switch (verifactuStatus) {
      case 'accepted':
        return 'submitted'
      case 'rejected':
      case 'cancelled':
      case 'error':
        return 'draft'
      case 'pending':
      case 'processing':
      default:
        return 'pending'
    }
  }
}

// Utility function to create and run a sync for a user
export async function syncUserVeriFactuStatus(userId: string): Promise<VeriFactuStatusSyncResult[]> {
  const supabase = createClient()
  const sync = new VeriFactuStatusSync(supabase)
  return await sync.syncAllUserInvoices(userId)
}