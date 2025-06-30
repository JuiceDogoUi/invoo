/**
 * TicketBAI API - Basque Country Invoice Compliance
 * Handles provincial differences and specific requirements
 */

import type { VeriFactuInvoice, VeriFactuSubmissionResponse } from '@/types'

export type BasqueProvince = 'alava' | 'guipuzcoa' | 'vizcaya'

export interface TicketBAIConfig {
  provincia: BasqueProvince
  nif: string
  certificate_type: 'device' | 'entity_representative' | 'entity_seal' | 'freelancer'
  certificate_data?: string
}

export interface TicketBAIInvoice extends VeriFactuInvoice {
  // Additional TicketBAI specific fields
  provincia: BasqueProvince
  codigo_qr?: string
  huella_digital?: string
  certificado_digital?: {
    tipo: 'device' | 'entity_representative' | 'entity_seal' | 'freelancer'
    data: string
  }
  
  // Provincial specific fields
  modificaciones_permitidas?: boolean // Different per province
  servicios_correccion?: boolean // Álava and Guipúzcoa only
}

export interface TicketBAIResponse extends VeriFactuSubmissionResponse {
  provincia: BasqueProvince
  codigo_qr: string
  huella_digital: string
  xml_firmado_url?: string
  estado_autoridad_fiscal: 'pending' | 'correct' | 'accepted_with_errors' | 'incorrect'
}

export interface ProvincialRules {
  alava: {
    certificate_registration: 'before_first_filing'
    invoice_modification: true
    correction_services: true
    max_invoice_amount?: number
  }
  guipuzcoa: {
    certificate_registration: 'after_first_filing'
    invoice_modification: true
    correction_services: true
    max_invoice_amount?: number
  }
  vizcaya: {
    certificate_registration: 'before_first_filing'
    invoice_modification: false // More restrictive
    correction_services: false
    max_invoice_amount?: number
  }
}

export class TicketBAIAPI {
  private apiKey: string
  private baseUrl: string
  private isProduction: boolean
  private provincialRules: ProvincialRules

  constructor(apiKey: string, isProduction = false) {
    this.apiKey = apiKey
    this.baseUrl = isProduction 
      ? 'https://api.verifacti.com' 
      : 'https://api-test.verifacti.com'
    this.isProduction = isProduction
    
    this.provincialRules = {
      alava: {
        certificate_registration: 'before_first_filing',
        invoice_modification: true,
        correction_services: true
      },
      guipuzcoa: {
        certificate_registration: 'after_first_filing',
        invoice_modification: true,
        correction_services: true
      },
      vizcaya: {
        certificate_registration: 'before_first_filing',
        invoice_modification: false,
        correction_services: false
      }
    }
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
      throw new Error(`TicketBAI API Error: ${result.error || response.statusText}`)
    }

    return result
  }

  // Main TicketBAI Operations
  async createTicketBAI(
    invoice: VeriFactuInvoice, 
    config: TicketBAIConfig
  ): Promise<TicketBAIResponse> {
    const validation = this.validateProvincialRequirements(invoice, config)
    if (validation.length > 0) {
      throw new Error(`TicketBAI validation failed: ${validation.join(', ')}`)
    }

    const ticketBAIInvoice: TicketBAIInvoice = {
      ...invoice,
      provincia: config.provincia,
      certificado_digital: {
        tipo: config.certificate_type,
        data: config.certificate_data || ''
      },
      modificaciones_permitidas: this.provincialRules[config.provincia].invoice_modification,
      servicios_correccion: this.provincialRules[config.provincia].correction_services
    }

    return this.makeRequest<TicketBAIResponse>('/ticketbai/create', ticketBAIInvoice)
  }

  async modifyTicketBAI(
    invoice: VeriFactuInvoice,
    config: TicketBAIConfig,
    originalSerie: string,
    originalNumero: string
  ): Promise<TicketBAIResponse> {
    // Check if province allows modifications
    if (!this.provincialRules[config.provincia].invoice_modification) {
      throw new Error(`Province ${config.provincia} does not allow invoice modifications`)
    }

    const ticketBAIInvoice: TicketBAIInvoice = {
      ...invoice,
      provincia: config.provincia,
      certificado_digital: {
        tipo: config.certificate_type,
        data: config.certificate_data || ''
      },
      // Reference to original invoice
      facturas_rectificadas: [{
        serie: originalSerie,
        numero: originalNumero,
        fecha_expedicion: invoice.fecha_expedicion
      }]
    }

    return this.makeRequest<TicketBAIResponse>('/ticketbai/modify', ticketBAIInvoice)
  }

  async cancelTicketBAI(
    serie: string,
    numero: string,
    config: TicketBAIConfig
  ): Promise<TicketBAIResponse> {
    return this.makeRequest<TicketBAIResponse>('/ticketbai/cancel', {
      serie,
      numero,
      provincia: config.provincia,
      certificado_digital: {
        tipo: config.certificate_type,
        data: config.certificate_data || ''
      }
    })
  }

  async getTicketBAIStatus(
    serie: string,
    numero: string,
    provincia: BasqueProvince
  ): Promise<TicketBAIResponse> {
    const response = await fetch(
      `${this.baseUrl}/ticketbai/status?serie=${serie}&numero=${numero}&provincia=${provincia}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get TicketBAI status: ${response.statusText}`)
    }

    return response.json()
  }

  // Validation Methods
  validateProvincialRequirements(invoice: VeriFactuInvoice, config: TicketBAIConfig): string[] {
    const errors: string[] = []
    const rules = this.provincialRules[config.provincia]

    // Common validations
    if (!config.nif) {
      errors.push('NIF is required for TicketBAI')
    }

    if (!config.certificate_type) {
      errors.push('Certificate type is required for TicketBAI')
    }

    const validCertTypes = ['device', 'entity_representative', 'entity_seal', 'freelancer']
    if (!validCertTypes.includes(config.certificate_type)) {
      errors.push(`Invalid certificate type. Must be one of: ${validCertTypes.join(', ')}`)
    }

    // Province-specific validations
    if (config.provincia === 'vizcaya') {
      // Vizcaya has more restrictive rules
      if (invoice.tipo_factura?.startsWith('R')) {
        errors.push('Vizcaya has limited support for rectification invoices')
      }
    }

    // Validate QR code requirements
    if (!invoice.importe_total || invoice.importe_total <= 0) {
      errors.push('Total amount must be greater than 0 for TicketBAI')
    }

    // Certificate registration timing validation
    if (rules.certificate_registration === 'before_first_filing' && !config.certificate_data) {
      errors.push(`${config.provincia} requires certificate registration before first filing`)
    }

    return errors
  }

  // Utility Methods
  getProvincialRules(provincia: BasqueProvince) {
    return this.provincialRules[provincia]
  }

  isModificationAllowed(provincia: BasqueProvince): boolean {
    return this.provincialRules[provincia].invoice_modification
  }

  isCorrectionServiceAvailable(provincia: BasqueProvince): boolean {
    return this.provincialRules[provincia].correction_services
  }

  getCertificateRegistrationTiming(provincia: BasqueProvince): string {
    return this.provincialRules[provincia].certificate_registration
  }

  // Generate TicketBAI specific invoice description
  generateTicketBAIDescription(invoice: VeriFactuInvoice): string {
    const baseDescription = invoice.descripcion || 'Prestación de servicios'
    
    // Add TicketBAI compliance note
    return `${baseDescription} - Factura TicketBAI`
  }

  // Validate digital certificate format
  validateDigitalCertificate(certificateData: string, type: string): boolean {
    // Basic validation - in production, this would be more comprehensive
    if (!certificateData || certificateData.length < 10) {
      return false
    }

    // Check if it looks like a base64 encoded certificate
    const base64Regex = /^[A-Za-z0-9+/]+=*$/
    return base64Regex.test(certificateData)
  }

  // Helper to determine if business operates in Basque Country
  static isBasqueCountryBusiness(provincia?: string, municipio?: string): boolean {
    const basqueProvinces = ['alava', 'álava', 'guipuzcoa', 'guipúzcoa', 'vizcaya', 'bizkaia']
    const basqueMunicipalities = [
      'vitoria', 'gasteiz', 'bilbao', 'san sebastian', 'donostia', 'barakaldo', 'getxo'
    ]

    if (provincia) {
      return basqueProvinces.some(p => 
        provincia.toLowerCase().includes(p) || p.includes(provincia.toLowerCase())
      )
    }

    if (municipio) {
      return basqueMunicipalities.some(m => 
        municipio.toLowerCase().includes(m) || m.includes(municipio.toLowerCase())
      )
    }

    return false
  }
}

export const ticketBAIAPI = new TicketBAIAPI(
  process.env.VERIFACTU_API_KEY || '',
  process.env.NODE_ENV === 'production'
)