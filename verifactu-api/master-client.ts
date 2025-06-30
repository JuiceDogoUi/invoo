/**
 * MASTER VERIFACTU CLIENT
 * Enterprise-grade client combining all bulletproof features:
 * - Comprehensive validation
 * - Retry logic and error recovery
 * - Rate limiting and circuit breaking
 * - Invoice chaining and audit trail
 * - Production safeguards
 * - Real-time monitoring
 */

import { BulletproofVeriFactuAPI, VeriFactuAPIError, VeriFactuValidationError } from './bulletproof-client'
import { invoiceChainManager, InvoiceChainEvent } from './invoice-chain-manager'
import { productionSafeguards } from './production-safeguards'
import { webhooksAPI, WebhookPayload } from './webhooks'
import { nifManagementAPI } from './nif-management'
import type { Invoice, VeriFactuInvoice, VeriFactuSubmissionResponse } from '@/types'

export interface MasterClientConfig {
  apiKey: string
  nif: string
  isProduction?: boolean
  enableChainTracking?: boolean
  enableWebhooks?: boolean
  webhookSecret?: string
  enableSafeguards?: boolean
}

export interface ProcessingResult {
  success: boolean
  response?: VeriFactuSubmissionResponse
  error?: VeriFactuAPIError
  chainEvent?: InvoiceChainEvent
  safeguardWarnings?: string[]
}

export class MasterVeriFactuClient {
  private bulletproofClient: BulletproofVeriFactuAPI
  private config: Required<MasterClientConfig>

  constructor(config: MasterClientConfig) {
    this.config = {
      enableChainTracking: true,
      enableWebhooks: true,
      enableSafeguards: true,
      webhookSecret: process.env.WEBHOOK_SECRET || '',
      isProduction: false,
      ...config
    }

    this.bulletproofClient = new BulletproofVeriFactuAPI({
      apiKey: this.config.apiKey,
      nif: this.config.nif,
      isProduction: this.config.isProduction,
      enableLogging: true
    })

    this.initializeWebhooks()
  }

  // Initialize webhook handling for real-time updates
  private async initializeWebhooks(): Promise<void> {
    if (!this.config.enableWebhooks || !this.config.webhookSecret) {
      return
    }

    try {
      // Ensure webhook is configured for this NIF
      const webhooks = await webhooksAPI.listWebhooks()
      const existingWebhook = webhooks.find(w => w.nifs.includes(this.config.nif))

      if (!existingWebhook) {
        await webhooksAPI.createWebhook({
          url: process.env.NEXT_PUBLIC_WEBHOOK_URL || '',
          secret: this.config.webhookSecret,
          nifs: [this.config.nif],
          activo: true
        })
      }
    } catch (error) {
      console.warn('Failed to initialize webhooks:', error)
    }
  }

  // Create invoice with full enterprise features
  async createInvoice(invoice: Invoice): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      // Pre-flight safety checks
      if (this.config.enableSafeguards) {
        const preflightResult = await productionSafeguards.preflightCheck()
        if (!preflightResult.canProceed) {
          return {
            success: false,
            error: new VeriFactuAPIError(
              'PREFLIGHT_FAILED',
              preflightResult.reason || 'Pre-flight check failed',
              [],
              429,
              true
            ),
            safeguardWarnings: [preflightResult.reason || 'Pre-flight check failed']
          }
        }
      }

      // Convert to VeriFactu format
      const veriFactuInvoice = this.convertToVeriFactuFormat(invoice)

      // Chain validation
      if (this.config.enableChainTracking) {
        const chainValidation = invoiceChainManager.validateChainOperation(
          invoice.id,
          'created'
        )
        
        if (!chainValidation.isValid) {
          return {
            success: false,
            error: new VeriFactuAPIError(
              'CHAIN_VALIDATION',
              `Chain validation failed: ${chainValidation.errors.join(', ')}`
            )
          }
        }
      }

      // Execute with safeguards
      const response = this.config.enableSafeguards
        ? await productionSafeguards.executeWithSafeguards(() => 
            this.bulletproofClient.createInvoice(veriFactuInvoice)
          )
        : await this.bulletproofClient.createInvoice(veriFactuInvoice)

      // Record chain event
      let chainEvent: InvoiceChainEvent | undefined
      if (this.config.enableChainTracking) {
        chainEvent = invoiceChainManager.recordEvent({
          invoice_id: invoice.id,
          event_type: 'created',
          verifactu_request: veriFactuInvoice,
          verifactu_response: response,
          status: 'success'
        })
      }

      // Generate QR code and compliance text for the invoice
      const qrCodeData = this.bulletproofClient.generateQRCodeData(veriFactuInvoice)
      const complianceText = this.bulletproofClient.generateComplianceText()
      
      // Enhanced response with AEAT compliance data
      const enhancedResponse = {
        ...response,
        qr_code_data: qrCodeData,
        compliance_text: complianceText
      }

      // Update invoice in database with VeriFactu response
      await this.updateInvoiceWithResponse(invoice.id, enhancedResponse)

      return {
        success: true,
        response: enhancedResponse,
        chainEvent
      }

    } catch (error) {
      // Record failed chain event
      let chainEvent: InvoiceChainEvent | undefined
      if (this.config.enableChainTracking) {
        chainEvent = invoiceChainManager.recordEvent({
          invoice_id: invoice.id,
          event_type: 'created',
          verifactu_request: this.convertToVeriFactuFormat(invoice),
          verifactu_response: null,
          status: 'failed',
          error_details: error instanceof Error ? error.message : String(error)
        })
      }

      return {
        success: false,
        error: error instanceof VeriFactuAPIError ? error : new VeriFactuAPIError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : String(error)
        ),
        chainEvent
      }
    }
  }

  // Modify invoice with chain tracking
  async modifyInvoice(invoice: Invoice): Promise<ProcessingResult> {
    try {
      // Chain validation
      if (this.config.enableChainTracking) {
        const chainValidation = invoiceChainManager.validateChainOperation(
          invoice.id,
          'modified'
        )
        
        if (!chainValidation.isValid) {
          return {
            success: false,
            error: new VeriFactuAPIError(
              'CHAIN_VALIDATION',
              `Chain validation failed: ${chainValidation.errors.join(', ')}`
            ),
            safeguardWarnings: chainValidation.warnings
          }
        }
      }

      const veriFactuInvoice = this.convertToVeriFactuFormat(invoice)
      
      const response = this.config.enableSafeguards
        ? await productionSafeguards.executeWithSafeguards(() => 
            this.bulletproofClient.modifyInvoice(veriFactuInvoice)
          )
        : await this.bulletproofClient.modifyInvoice(veriFactuInvoice)

      // Record chain event
      let chainEvent: InvoiceChainEvent | undefined
      if (this.config.enableChainTracking) {
        chainEvent = invoiceChainManager.recordEvent({
          invoice_id: invoice.id,
          event_type: 'modified',
          verifactu_request: veriFactuInvoice,
          verifactu_response: response,
          status: 'success'
        })
      }

      await this.updateInvoiceWithResponse(invoice.id, response)

      return {
        success: true,
        response,
        chainEvent
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof VeriFactuAPIError ? error : new VeriFactuAPIError(
          'MODIFY_ERROR',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  // Cancel invoice with chain tracking
  async cancelInvoice(invoiceId: string, serie: string, numero: string): Promise<ProcessingResult> {
    try {
      // Chain validation
      if (this.config.enableChainTracking) {
        const chainValidation = invoiceChainManager.validateChainOperation(
          invoiceId,
          'cancelled'
        )
        
        if (!chainValidation.isValid) {
          return {
            success: false,
            error: new VeriFactuAPIError(
              'CHAIN_VALIDATION',
              `Chain validation failed: ${chainValidation.errors.join(', ')}`
            ),
            safeguardWarnings: chainValidation.warnings
          }
        }
      }

      const response = this.config.enableSafeguards
        ? await productionSafeguards.executeWithSafeguards(() => 
            this.bulletproofClient.cancelInvoice(serie, numero)
          )
        : await this.bulletproofClient.cancelInvoice(serie, numero)

      // Record chain event
      let chainEvent: InvoiceChainEvent | undefined
      if (this.config.enableChainTracking) {
        chainEvent = invoiceChainManager.recordEvent({
          invoice_id: invoiceId,
          event_type: 'cancelled',
          verifactu_request: { serie, numero },
          verifactu_response: response,
          status: 'success'
        })
      }

      await this.updateInvoiceWithResponse(invoiceId, response)

      return {
        success: true,
        response,
        chainEvent
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof VeriFactuAPIError ? error : new VeriFactuAPIError(
          'CANCEL_ERROR',
          error instanceof Error ? error.message : String(error)
        )
      }
    }
  }

  // Get comprehensive invoice status
  async getInvoiceStatus(serie: string, numero: string): Promise<{
    verifactuStatus: any
    chainEvents: InvoiceChainEvent[]
    safeguardStatus: any
  }> {
    const [verifactuStatus, chainEvents, safeguardStatus] = await Promise.all([
      this.bulletproofClient.getInvoiceStatus(serie, numero),
      this.config.enableChainTracking 
        ? invoiceChainManager.getInvoiceChain(`${serie}-${numero}`)
        : [],
      this.config.enableSafeguards
        ? productionSafeguards.getStatus()
        : null
    ])

    return {
      verifactuStatus,
      chainEvents,
      safeguardStatus
    }
  }

  // Process webhook update
  async processWebhookUpdate(payload: WebhookPayload): Promise<void> {
    if (!this.config.enableWebhooks) return

    try {
      // Update invoice status in database
      await this.updateInvoiceStatus(payload.uuid, payload.estado)

      // Record chain event if tracking enabled
      if (this.config.enableChainTracking) {
        invoiceChainManager.recordEvent({
          invoice_id: payload.uuid,
          event_type: 'modified',
          verifactu_request: null,
          verifactu_response: payload,
          status: payload.estado === 'correct' ? 'success' : 'failed',
          error_details: payload.errores?.map(e => e.mensaje).join('; ')
        })
      }

    } catch (error) {
      console.error('Failed to process webhook update:', error)
    }
  }

  // Convert Invoice to VeriFactuInvoice with bulletproof logic
  private convertToVeriFactuFormat(invoice: Invoice): VeriFactuInvoice {
    const serie = invoice.serie || invoice.invoice_number.split('-')[0] || 'A'
    const numero = invoice.numero?.toString() || invoice.invoice_number.split('-')[1] || '1'
    
    // Convert ISO date (YYYY-MM-DD) to VeriFactu format (DD-MM-YYYY)
    const formatDate = (isoDate: string): string => {
      const [year, month, day] = isoDate.split('-')
      return `${day}-${month}-${year}`
    }

    // Generate comprehensive description
    const generateDescription = (): string => {
      if (invoice.line_items && invoice.line_items.length === 1) {
        return invoice.line_items[0].description
      }
      if (invoice.line_items && invoice.line_items.length > 1) {
        return `Servicios varios (${invoice.line_items.length} conceptos)`
      }
      return 'Prestación de servicios profesionales'
    }

    // Convert line items with precise calculations
    const convertLineItems = (): any[] => {
      return invoice.line_items?.map(item => {
        const baseImponible = item.unit_price * item.quantity
        const tipoImpositivo = item.tax_rate
        const cuotaRepercutida = Math.round((baseImponible * tipoImpositivo) / 100 * 100) / 100 // Round to 2 decimals
        
        return {
          base_imponible: baseImponible,
          tipo_impositivo: tipoImpositivo,
          cuota_repercutida: cuotaRepercutida,
          descripcion: item.description,
          cantidad: item.quantity,
          precio_unitario: item.unit_price
        }
      }) || []
    }

    return {
      serie,
      numero,
      fecha_expedicion: formatDate(invoice.issue_date),
      tipo_factura: invoice.invoice_type || (invoice.total < 3000 && !invoice.client_tax_id ? 'F2' : 'F1'),
      descripcion: generateDescription(),
      
      // Conditional recipient data
      ...(invoice.client_tax_id && {
        nif: invoice.client_tax_id,
        nombre: invoice.client_name
      }),
      
      lineas: convertLineItems(),
      importe_total: invoice.total,
      nif_emisor: this.config.nif
    }
  }

  // Update invoice with VeriFactu response
  private async updateInvoiceWithResponse(invoiceId: string, response: VeriFactuSubmissionResponse): Promise<void> {
    // This would update the database with VeriFactu response data
    // Implementation depends on your database layer
    console.log(`Updating invoice ${invoiceId} with VeriFactu response:`, {
      verifactu_id: response.id,
      verifactu_status: response.status,
      hash: response.hash,
      qr_code_url: response.qr_code_url
    })
  }

  // Update invoice status from webhook
  private async updateInvoiceStatus(invoiceId: string, status: string): Promise<void> {
    // This would update the invoice status in the database
    console.log(`Updating invoice ${invoiceId} status to:`, status)
  }

  // Health check for entire system
  async healthCheck(): Promise<{
    api: boolean
    safeguards: any
    webhooks: boolean
    chainTracking: boolean
    overall: boolean
  }> {
    const [apiHealth, safeguardStatus] = await Promise.all([
      this.bulletproofClient.healthCheck(),
      this.config.enableSafeguards ? productionSafeguards.getStatus() : null
    ])

    const result = {
      api: apiHealth,
      safeguards: safeguardStatus,
      webhooks: this.config.enableWebhooks,
      chainTracking: this.config.enableChainTracking,
      overall: apiHealth && (!safeguardStatus || safeguardStatus.health.status !== 'UNHEALTHY')
    }

    return result
  }

  // Get comprehensive system status
  getSystemStatus(): {
    client: any
    chain: any
    safeguards: any
  } {
    return {
      client: this.bulletproofClient.getConfig(),
      chain: this.config.enableChainTracking ? invoiceChainManager.getChainStatistics() : null,
      safeguards: this.config.enableSafeguards ? productionSafeguards.getStatus() : null
    }
  }

  // Emergency operations
  emergencyShutdown(): void {
    if (this.config.enableSafeguards) {
      productionSafeguards.emergencyShutdown()
    }
  }

  reset(): void {
    if (this.config.enableSafeguards) {
      productionSafeguards.reset()
    }
    if (this.config.enableChainTracking) {
      invoiceChainManager.clearAllChains()
    }
  }
}

// Create master client singleton
export const masterVeriFactuClient = new MasterVeriFactuClient({
  apiKey: process.env.VERIFACTU_API_KEY || '',
  nif: process.env.COMPANY_NIF || '',
  isProduction: process.env.NODE_ENV === 'production',
  webhookSecret: process.env.WEBHOOK_SECRET
})