/**
 * BULLETPROOF VERIFACTU API CLIENT
 * Enterprise-grade implementation with comprehensive error handling,
 * retry logic, validation, and production safeguards
 */

import type { Invoice, VeriFactuResponse, VeriFactuInvoice, VeriFactuSubmissionResponse, VeriFactuLineItem, InvoiceLineItem } from '@/types'

// Enhanced error types with detailed context
export class VeriFactuAPIError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public details?: string[],
    public httpStatus?: number,
    public retryable?: boolean,
    public originalResponse?: any
  ) {
    super(message)
    this.name = 'VeriFactuAPIError'
  }
}

export class VeriFactuValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public value?: any
  ) {
    super(message)
    this.name = 'VeriFactuValidationError'
  }
}

// Request context for tracking and debugging
interface RequestContext {
  requestId: string
  timestamp: Date
  endpoint: string
  attempt: number
  totalAttempts: number
}

// Configuration interface
interface VeriFactuConfig {
  apiKey: string
  nif: string
  isProduction?: boolean
  maxRetries?: number
  retryDelayMs?: number
  timeoutMs?: number
  enableLogging?: boolean
  rateLimitPerSecond?: number
}

// Rate limiter implementation
class RateLimiter {
  private requests: number[] = []
  private maxRequestsPerSecond: number

  constructor(maxRequestsPerSecond: number = 10) {
    this.maxRequestsPerSecond = maxRequestsPerSecond
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < 1000)

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = 1000 - (now - oldestRequest)
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    this.requests.push(now)
  }
}

// Request tracker for monitoring
class RequestTracker {
  private static instance: RequestTracker
  private requests: Map<string, RequestContext> = new Map()

  static getInstance(): RequestTracker {
    if (!RequestTracker.instance) {
      RequestTracker.instance = new RequestTracker()
    }
    return RequestTracker.instance
  }

  track(context: RequestContext): void {
    this.requests.set(context.requestId, context)
  }

  complete(requestId: string): void {
    this.requests.delete(requestId)
  }

  getActiveRequests(): RequestContext[] {
    return Array.from(this.requests.values())
  }
}

export class BulletproofVeriFactuAPI {
  private config: Required<VeriFactuConfig>
  private baseUrl: string
  private rateLimiter: RateLimiter
  private tracker: RequestTracker

  constructor(config: VeriFactuConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      enableLogging: true,
      rateLimitPerSecond: 10,
      isProduction: false,
      ...config
    }

    this.baseUrl = this.config.isProduction 
      ? 'https://api.verifacti.com' 
      : 'https://api-test.verifacti.com'
    
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerSecond)
    this.tracker = RequestTracker.getInstance()

    this.validateConfig()
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('VeriFactu API key is required')
    }

    if (!this.config.nif) {
      throw new Error('Company NIF is required')
    }

    if (this.config.isProduction && this.config.apiKey.includes('test')) {
      throw new Error('Production mode cannot use test API key')
    }

    if (!this.config.isProduction && !this.config.apiKey.includes('test')) {
      console.warn('⚠️  Using production API key in test mode')
    }
  }

  private generateRequestId(): string {
    return `vf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context?: any): void {
    if (!this.config.enableLogging) return

    const prefix = `[VeriFactu${this.config.isProduction ? '-PROD' : '-TEST'}]`
    console[level](`${prefix} ${message}`, context || '')
  }

  private async makeRequestWithRetry<T>(
    endpoint: string, 
    data: any, 
    method: string = 'POST'
  ): Promise<T> {
    const requestId = this.generateRequestId()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const context: RequestContext = {
        requestId,
        timestamp: new Date(),
        endpoint,
        attempt,
        totalAttempts: this.config.maxRetries
      }

      this.tracker.track(context)

      try {
        // Rate limiting
        await this.rateLimiter.waitIfNeeded()

        this.log('info', `Request ${requestId} attempt ${attempt}/${this.config.maxRetries}`, {
          endpoint,
          attempt
        })

        const result = await this.makeRequest<T>(endpoint, data, method, context)
        
        this.tracker.complete(requestId)
        this.log('info', `Request ${requestId} succeeded`, { endpoint })
        
        return result

      } catch (error) {
        lastError = error as Error
        this.log('warn', `Request ${requestId} attempt ${attempt} failed`, {
          endpoint,
          error: error instanceof Error ? error.message : String(error)
        })

        // Don't retry on validation errors or 4xx client errors
        if (error instanceof VeriFactuValidationError || 
            (error instanceof VeriFactuAPIError && error.httpStatus && error.httpStatus < 500)) {
          this.tracker.complete(requestId)
          throw error
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1)
          this.log('info', `Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    this.tracker.complete(requestId)
    this.log('error', `Request ${requestId} failed after all attempts`, {
      endpoint,
      finalError: lastError?.message
    })

    throw lastError || new Error('Request failed after all retry attempts')
  }

  private async makeRequest<T>(
    endpoint: string, 
    data: any, 
    method: string = 'POST',
    context: RequestContext
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const url = `${this.baseUrl}${endpoint}`
      
      this.log('info', `Making request to ${url}`, {
        requestId: context.requestId,
        method,
        dataSize: JSON.stringify(data).length
      })

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Request-ID': context.requestId,
          'User-Agent': `Invoo.es/1.0 (VeriFactu Client)`
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const responseText = await response.text()
      let result: any

      try {
        result = JSON.parse(responseText)
      } catch {
        throw new VeriFactuAPIError(
          'PARSE_ERROR',
          `Invalid JSON response: ${responseText.substring(0, 200)}`,
          [],
          response.status,
          false,
          responseText
        )
      }

      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429
        
        throw new VeriFactuAPIError(
          result.error || `HTTP_${response.status}`,
          result.message || `HTTP ${response.status}: ${response.statusText}`,
          result.details || [],
          response.status,
          isRetryable,
          result
        )
      }

      // Validate response structure
      if (!result || typeof result !== 'object') {
        throw new VeriFactuAPIError(
          'INVALID_RESPONSE',
          'Response is not a valid object',
          [],
          response.status,
          false,
          result
        )
      }

      return result as T

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new VeriFactuAPIError(
          'TIMEOUT',
          `Request timeout after ${this.config.timeoutMs}ms`,
          [],
          undefined,
          true
        )
      }

      throw error
    }
  }

  // Core API Methods with bulletproof validation
  async createInvoice(invoiceData: VeriFactuInvoice): Promise<VeriFactuSubmissionResponse> {
    this.validateInvoiceData(invoiceData)

    const payload = {
      ...invoiceData,
      nif_emisor: this.config.nif
    }

    this.log('info', 'Creating invoice', {
      serie: invoiceData.serie,
      numero: invoiceData.numero,
      total: invoiceData.importe_total
    })

    return this.makeRequestWithRetry<VeriFactuSubmissionResponse>('/verifactu/create', payload)
  }

  async modifyInvoice(invoiceData: VeriFactuInvoice): Promise<VeriFactuSubmissionResponse> {
    this.validateInvoiceData(invoiceData)

    const payload = {
      ...invoiceData,
      nif_emisor: this.config.nif
    }

    this.log('info', 'Modifying invoice', {
      serie: invoiceData.serie,
      numero: invoiceData.numero
    })

    return this.makeRequestWithRetry<VeriFactuSubmissionResponse>('/verifactu/modify', payload)
  }

  async cancelInvoice(serie: string, numero: string): Promise<VeriFactuSubmissionResponse> {
    if (!serie || !numero) {
      throw new VeriFactuValidationError('serie_numero', 'Serie and numero are required for cancellation')
    }

    this.log('info', 'Cancelling invoice', { serie, numero })

    return this.makeRequestWithRetry<VeriFactuSubmissionResponse>('/verifactu/cancel', {
      nif_emisor: this.config.nif,
      serie,
      numero
    })
  }

  async getInvoiceStatus(serie: string, numero: string): Promise<any> {
    if (!serie || !numero) {
      throw new VeriFactuValidationError('serie_numero', 'Serie and numero are required for status check')
    }

    const response = await fetch(
      `${this.baseUrl}/verifactu/status?nif=${this.config.nif}&serie=${serie}&numero=${numero}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new VeriFactuAPIError(
        'STATUS_ERROR',
        `Failed to get invoice status: ${response.statusText}`,
        [],
        response.status
      )
    }

    return response.json()
  }

  // Comprehensive validation with exact API specifications
  private validateInvoiceData(invoice: VeriFactuInvoice): void {
    const errors: VeriFactuValidationError[] = []

    // Mandatory field validation
    if (!invoice.serie || invoice.serie.trim() === '') {
      errors.push(new VeriFactuValidationError('serie', 'Serie is mandatory', invoice.serie))
    }

    if (!invoice.numero || invoice.numero.trim() === '') {
      errors.push(new VeriFactuValidationError('numero', 'Numero is mandatory', invoice.numero))
    }

    // Serie + numero length constraint (critical VeriFactu requirement)
    if (invoice.serie && invoice.numero && (invoice.serie + invoice.numero).length > 60) {
      errors.push(new VeriFactuValidationError(
        'serie_numero_length',
        'Combined serie + numero cannot exceed 60 characters',
        { serie: invoice.serie, numero: invoice.numero, combined: invoice.serie + invoice.numero }
      ))
    }

    // Date validation with exact format
    if (!invoice.fecha_expedicion) {
      errors.push(new VeriFactuValidationError('fecha_expedicion', 'Issue date is mandatory'))
    } else {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/
      if (!dateRegex.test(invoice.fecha_expedicion)) {
        errors.push(new VeriFactuValidationError(
          'fecha_expedicion',
          'Date must be in DD-MM-YYYY format',
          invoice.fecha_expedicion
        ))
      } else {
        // Validate it's not a future date
        const [day, month, year] = invoice.fecha_expedicion.split('-').map(Number)
        const invoiceDate = new Date(year, month - 1, day)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        
        if (invoiceDate > today) {
          errors.push(new VeriFactuValidationError(
            'fecha_expedicion',
            'Invoice date cannot be in the future',
            invoice.fecha_expedicion
          ))
        }
      }
    }

    // Invoice type validation
    const validTypes = ['F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5']
    if (!invoice.tipo_factura || !validTypes.includes(invoice.tipo_factura)) {
      errors.push(new VeriFactuValidationError(
        'tipo_factura',
        `Invalid invoice type. Must be one of: ${validTypes.join(', ')}`,
        invoice.tipo_factura
      ))
    }

    // Description validation (1-500 characters)
    if (!invoice.descripcion || invoice.descripcion.trim() === '') {
      errors.push(new VeriFactuValidationError('descripcion', 'Description is mandatory'))
    } else if (invoice.descripcion.length < 1 || invoice.descripcion.length > 500) {
      errors.push(new VeriFactuValidationError(
        'descripcion',
        'Description must be between 1 and 500 characters',
        { length: invoice.descripcion.length, value: invoice.descripcion.substring(0, 50) + '...' }
      ))
    }

    // Line items validation (1-12 items)
    if (!invoice.lineas || invoice.lineas.length === 0) {
      errors.push(new VeriFactuValidationError('lineas', 'At least one line item is required'))
    } else if (invoice.lineas.length > 12) {
      errors.push(new VeriFactuValidationError(
        'lineas',
        'Maximum 12 line items allowed',
        { count: invoice.lineas.length }
      ))
    } else {
      // Validate each line item
      invoice.lineas.forEach((item, index) => {
        this.validateLineItem(item, index, errors)
      })
    }

    // Total amount validation
    if (!invoice.importe_total || invoice.importe_total <= 0) {
      errors.push(new VeriFactuValidationError(
        'importe_total',
        'Total amount must be greater than 0',
        invoice.importe_total
      ))
    }

    // F2 specific validation (simplified invoices)
    if (invoice.tipo_factura === 'F2' && invoice.importe_total >= 3000) {
      errors.push(new VeriFactuValidationError(
        'importe_total_f2',
        'Simplified invoices (F2) must be under €3,000',
        invoice.importe_total
      ))
    }

    // Calculate and validate totals (±€10 tolerance)
    if (invoice.lineas && invoice.lineas.length > 0) {
      const calculatedTotal = invoice.lineas.reduce((sum, line) => {
        return sum + line.base_imponible + line.cuota_repercutida
      }, 0)

      const difference = Math.abs(calculatedTotal - invoice.importe_total)
      if (difference > 10) {
        errors.push(new VeriFactuValidationError(
          'total_mismatch',
          `Invoice total differs too much from calculated total. Max ±€10 allowed, difference: €${difference.toFixed(2)}`,
          { calculated: calculatedTotal, declared: invoice.importe_total, difference }
        ))
      }
    }

    // Throw aggregated errors
    if (errors.length > 0) {
      const message = errors.map(e => `${e.field}: ${e.message}`).join('; ')
      throw new VeriFactuAPIError(
        'VALIDATION_ERROR',
        `Invoice validation failed: ${message}`,
        errors.map(e => e.message),
        400,
        false,
        errors
      )
    }
  }

  private validateLineItem(item: VeriFactuLineItem, index: number, errors: VeriFactuValidationError[]): void {
    const prefix = `lineas[${index}]`

    // Base imponible validation
    if (typeof item.base_imponible !== 'number' || item.base_imponible < 0) {
      errors.push(new VeriFactuValidationError(
        `${prefix}.base_imponible`,
        'Base imponible must be a positive number',
        item.base_imponible
      ))
    }

    // Tax rate validation (Spanish IVA rates)
    const validTaxRates = [0, 4, 10, 21]
    if (typeof item.tipo_impositivo !== 'number' || !validTaxRates.includes(item.tipo_impositivo)) {
      errors.push(new VeriFactuValidationError(
        `${prefix}.tipo_impositivo`,
        `Invalid tax rate. Must be one of: ${validTaxRates.join(', ')}%`,
        item.tipo_impositivo
      ))
    }

    // Tax amount validation
    if (typeof item.cuota_repercutida !== 'number' || item.cuota_repercutida < 0) {
      errors.push(new VeriFactuValidationError(
        `${prefix}.cuota_repercutida`,
        'Tax amount must be a positive number',
        item.cuota_repercutida
      ))
    }

    // Validate tax calculation
    if (typeof item.base_imponible === 'number' && typeof item.tipo_impositivo === 'number') {
      const expectedTax = (item.base_imponible * item.tipo_impositivo) / 100
      const difference = Math.abs(expectedTax - item.cuota_repercutida)
      
      if (difference > 0.01) { // 1 cent tolerance
        errors.push(new VeriFactuValidationError(
          `${prefix}.tax_calculation`,
          `Tax calculation mismatch. Expected: ${expectedTax.toFixed(2)}, got: ${item.cuota_repercutida}`,
          { expected: expectedTax, actual: item.cuota_repercutida, difference }
        ))
      }
    }
  }

  // Generate AEAT-compliant QR code data
  generateQRCodeData(invoice: VeriFactuInvoice): string {
    const params = new URLSearchParams({
      nif: invoice.nif_emisor || this.config.nif,
      numserie: `${invoice.serie}${invoice.numero}`,
      fecha: invoice.fecha_expedicion,
      importe: invoice.importe_total.toFixed(2)
    })
    return `https://preverifactu.aeat.es/verifactu?${params.toString()}`
  }

  // Generate AEAT-compliant text for invoices
  generateComplianceText(): string {
    return "Factura sujeta a VeriFactu. Más información en la sede electrónica de la AEAT"
  }

  // Utility methods for monitoring and debugging
  getActiveRequests(): RequestContext[] {
    return this.tracker.getActiveRequests()
  }

  getConfig(): Readonly<Required<VeriFactuConfig>> {
    return { ...this.config }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to get status of a non-existent invoice
      // This should return a 404, but proves the API is responding
      await this.getInvoiceStatus('HEALTH', '999999')
      return true
    } catch (error) {
      if (error instanceof VeriFactuAPIError && error.httpStatus === 404) {
        return true // 404 is expected for health check
      }
      this.log('error', 'Health check failed', { error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }
}

// Export singleton with environment detection
export const bulletproofVeriFactuAPI = new BulletproofVeriFactuAPI({
  apiKey: process.env.VERIFACTU_API_KEY || '',
  nif: process.env.COMPANY_NIF || '',
  isProduction: process.env.NODE_ENV === 'production',
  enableLogging: process.env.NODE_ENV !== 'production'
})