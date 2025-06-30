import type { Invoice, VeriFactuResponse, VeriFactuInvoice, VeriFactuSubmissionResponse, VeriFactuLineItem, InvoiceLineItem } from '@/types'

export type VeriFactuInvoiceType = 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'F3'

export interface VeriFactuError {
  error: string
  message: string
  details?: string[]
}

export class VeriFactuAPI {
  private apiKey: string
  private baseUrl: string
  private isProduction: boolean
  private nif: string

  constructor(apiKey: string, nif: string, isProduction = false) {
    this.apiKey = apiKey
    this.nif = nif
    this.baseUrl = isProduction 
      ? 'https://api.verifacti.com' 
      : 'https://api-test.verifacti.com'
    this.isProduction = isProduction
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new VeriFactuAPIError(result.error || 'Unknown error', result.message, result.details)
    }

    return result
  }

  async createInvoice(invoiceData: VeriFactuInvoice): Promise<VeriFactuSubmissionResponse> {
    // Ensure NIF is included in payload
    const payload = {
      ...invoiceData,
      nif_emisor: this.nif
    }
    return this.makeRequest<VeriFactuSubmissionResponse>('/verifactu/create', payload)
  }

  async modifyInvoice(invoiceData: VeriFactuInvoice): Promise<VeriFactuSubmissionResponse> {
    const payload = {
      ...invoiceData,
      nif_emisor: this.nif
    }
    return this.makeRequest<VeriFactuSubmissionResponse>('/verifactu/modify', payload)
  }

  async cancelInvoice(serie: string, numero: string): Promise<VeriFactuSubmissionResponse> {
    return this.makeRequest<VeriFactuSubmissionResponse>('/verifactu/cancel', {
      nif_emisor: this.nif,
      serie,
      numero
    })
  }

  async createTicketBAI(invoiceData: VeriFactuInvoice, province: 'alava' | 'guipuzcoa' | 'vizcaya'): Promise<VeriFactuSubmissionResponse> {
    const payload = {
      ...invoiceData,
      nif: this.nif,
      provincia: province
    }
    return this.makeRequest<VeriFactuSubmissionResponse>('/ticketbai/create', payload)
  }

  async bulkCreateInvoices(invoices: VeriFactuInvoice[]): Promise<VeriFactuSubmissionResponse[]> {
    if (invoices.length > 50) {
      throw new Error('Maximum 50 invoices per bulk submission')
    }
    return this.makeRequest<VeriFactuSubmissionResponse[]>('/bulk/create', { invoices })
  }

  async getInvoiceStatus(serie: string, numero: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/verifactu/status?nif=${this.nif}&serie=${serie}&numero=${numero}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get invoice status: ${response.statusText}`)
    }

    return response.json()
  }

  async activateNIF(): Promise<boolean> {
    try {
      await this.makeRequest('/nif/activate', { nif: this.nif })
      return true
    } catch (error) {
      console.error('Failed to activate NIF:', error)
      return false
    }
  }

  async deactivateNIF(): Promise<boolean> {
    try {
      await this.makeRequest('/nif/deactivate', { nif: this.nif })
      return true
    } catch (error) {
      console.error('Failed to deactivate NIF:', error)
      return false
    }
  }

  convertToVeriFactuFormat(invoice: Invoice): VeriFactuInvoice {
    const serie = invoice.serie || invoice.invoice_number.split('-')[0] || 'A'
    const numero = invoice.numero?.toString() || invoice.invoice_number.split('-')[1] || '1'
    
    // Convert ISO date (YYYY-MM-DD) to VeriFactu format (DD-MM-YYYY)
    const formatDate = (isoDate: string): string => {
      const [year, month, day] = isoDate.split('-')
      return `${day}-${month}-${year}`
    }
    
    const veriFactuInvoice: VeriFactuInvoice = {
      serie,
      numero,
      fecha_expedicion: formatDate(invoice.issue_date),
      tipo_factura: this.determineInvoiceType(invoice),
      descripcion: this.generateInvoiceDescription(invoice),
      
      // Recipient data (conditional based on invoice type)
      ...(invoice.client_tax_id && {
        nif: invoice.client_tax_id,
        nombre: invoice.client_name
      }),
      
      // Line items with proper VeriFactu structure
      lineas: invoice.line_items?.map(item => this.convertLineItem(item)) || [],
      importe_total: invoice.total,
      
      nif_emisor: this.nif
    }
    
    return veriFactuInvoice
  }

  private convertLineItem(item: InvoiceLineItem): VeriFactuLineItem {
    // Calculate tax amounts properly
    const baseImponible = item.unit_price * item.quantity
    const tipoImpositivo = item.tax_rate
    const cuotaRepercutida = (baseImponible * tipoImpositivo) / 100
    
    return {
      base_imponible: baseImponible,
      tipo_impositivo: tipoImpositivo,
      cuota_repercutida: cuotaRepercutida,
      descripcion: item.description,
      cantidad: item.quantity,
      precio_unitario: item.unit_price
    }
  }

  private generateInvoiceDescription(invoice: Invoice): string {
    if (invoice.line_items && invoice.line_items.length === 1) {
      return invoice.line_items[0].description
    }
    
    if (invoice.line_items && invoice.line_items.length > 1) {
      return `Servicios varios (${invoice.line_items.length} conceptos)`
    }
    
    return 'Prestación de servicios profesionales'
  }

  private determineInvoiceType(invoice: Invoice): VeriFactuInvoiceType {
    // If explicitly set, use that
    if (invoice.invoice_type) {
      return invoice.invoice_type
    }

    // F1: Standard invoice - requires recipient identification
    // F2: Simplified invoice (< 3,000€) - no recipient ID required
    // R1-R5: Rectification invoices
    // F3: Summary invoice
    
    // For simplified invoices under 3,000€
    if (invoice.total < 3000 && !invoice.client_tax_id) {
      return 'F2'
    }
    
    // For tickets/receipts (typically small amounts)
    if (invoice.total < 400 && !invoice.client_tax_id) {
      return 'F2'
    }
    
    // Default to standard invoice
    return 'F1'
  }

  async signInvoice(invoice: Invoice): Promise<VeriFactuResponse> {
    try {
      const veriFactuInvoice = this.convertToVeriFactuFormat(invoice)
      const response = await this.createInvoice(veriFactuInvoice)
      
      return {
        hash: response.hash || '',
        signature: response.signature || '',
        qr_code_url: response.qr_code_url || '',
        pdf_url: response.pdf_url,
        status: response.status || 'pending',
        verifactu_id: response.id
      }
    } catch (error) {
      if (error instanceof VeriFactuAPIError) {
        throw error
      }
      throw new Error(`Failed to sign invoice: ${error}`)
    }
  }

  async submitToAEAT(invoice: Invoice): Promise<boolean> {
    try {
      const response = await this.signInvoice(invoice)
      // VeriFactu automatically handles AEAT submission
      return response.status === 'submitted' || response.status === 'accepted'
    } catch (error) {
      console.error('AEAT submission failed:', error)
      return false
    }
  }

  validateInvoiceData(invoice: Invoice): string[] {
    const errors: string[] = []

    // Basic mandatory fields
    if (!invoice.invoice_number) {
      errors.push('Invoice number is required')
    }

    if (!invoice.issue_date) {
      errors.push('Issue date is required')
    }

    if (invoice.total <= 0) {
      errors.push('Invoice total must be greater than 0')
    }

    if (!invoice.line_items || invoice.line_items.length === 0) {
      errors.push('At least one line item is required')
    }

    if (invoice.line_items && invoice.line_items.length > 12) {
      errors.push('Maximum 12 line items allowed')
    }

    // VeriFactu-specific validations
    const invoiceType = this.determineInvoiceType(invoice)
    
    // Invoice type specific validations
    if (invoiceType === 'F1') {
      // Standard invoices require recipient identification
      if (!invoice.client_tax_id && !invoice.client_name) {
        errors.push('Standard invoices (F1) require client tax ID or name')
      }
    }

    if (invoiceType === 'F2') {
      // Simplified invoices must be under 3,000€
      if (invoice.total >= 3000) {
        errors.push('Simplified invoices (F2) must be under 3,000€')
      }
    }

    // Serie validation (max 60 chars combined with numero)
    const serie = invoice.serie || invoice.invoice_number.split('-')[0]
    const numero = invoice.numero?.toString() || invoice.invoice_number.split('-')[1] || '1'
    
    if ((serie + numero).length > 60) {
      errors.push('Serie + numero combination cannot exceed 60 characters')
    }

    if (!serie || !/^[A-Z0-9]+$/.test(serie)) {
      errors.push('Invoice serie must be alphanumeric')
    }

    // Date validation (cannot be future date)
    const issueDate = new Date(invoice.issue_date)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today
    
    if (issueDate > today) {
      errors.push('Invoice date cannot be in the future')
    }

    // Line items validation with proper tax calculations
    if (invoice.line_items) {
      let calculatedTotal = 0
      const validTaxRates = [0, 4, 10, 21]
      
      for (const item of invoice.line_items) {
        // Validate tax rates
        if (!validTaxRates.includes(item.tax_rate)) {
          errors.push(`Invalid tax rate ${item.tax_rate}%. Valid Spanish IVA rates: 0%, 4%, 10%, 21%`)
        }
        
        // Calculate what the total should be
        const baseImponible = item.unit_price * item.quantity
        const taxAmount = (baseImponible * item.tax_rate) / 100
        const expectedTotal = baseImponible + taxAmount
        calculatedTotal += expectedTotal
        
        // Validate individual line item total
        const difference = Math.abs(item.total - expectedTotal)
        if (difference > 0.01) { // Allow 1 cent rounding difference
          errors.push(`Line item "${item.description}" total mismatch. Expected: ${expectedTotal.toFixed(2)}, got: ${item.total}`)
        }
      }
      
      // Validate total invoice amount (±€10 tolerance per VeriFactu docs)
      const totalDifference = Math.abs(calculatedTotal - invoice.total)
      if (totalDifference > 10) {
        errors.push(`Invoice total differs too much from calculated total. Max ±€10 allowed, difference: €${totalDifference.toFixed(2)}`)
      }
    }

    // Description validation (will be auto-generated if not provided)
    const description = this.generateInvoiceDescription(invoice)
    if (description.length > 500) {
      errors.push('Invoice description cannot exceed 500 characters')
    }

    return errors
  }
}

export class VeriFactuAPIError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public details?: string[]
  ) {
    super(message)
    this.name = 'VeriFactuAPIError'
  }
}

export const veriFactuAPI = new VeriFactuAPI(
  process.env.VERIFACTU_API_KEY || '',
  process.env.COMPANY_NIF || '',
  process.env.NODE_ENV === 'production'
)