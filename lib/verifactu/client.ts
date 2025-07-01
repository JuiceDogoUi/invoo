import type { VeriFactuInvoice, VeriFactuSubmissionResponse, VeriFactuError } from '@/types'

export class VeriFactuClient {
  private apiKey: string
  private baseUrl: string
  private nif: string

  constructor(apiKey: string, nif: string, isProduction = false) {
    this.apiKey = apiKey
    this.nif = nif
    this.baseUrl = isProduction 
      ? 'https://api.verifacti.com/verifactu' 
      : 'https://api.verifacti.com/verifactu' // Test environment
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new VeriFactuAPIError(
        `VeriFactu API Error: ${response.status}`,
        response.status,
        data.errors || [{ code: 'API_ERROR', message: data.error || data.message || 'Unknown error' }]
      )
    }

    return data
  }

  // Health check to verify API key and connection
  async healthCheck(): Promise<{ status: string; nif: string; environment: string }> {
    return this.request('/health')
  }

  // Create invoice in VeriFactu
  async createInvoice(invoice: VeriFactuInvoice): Promise<VeriFactuSubmissionResponse> {
    // Add the company NIF to the invoice data
    const invoiceWithNIF = {
      ...invoice,
      nif_emisor: this.nif
    }

    return this.request('/create', {
      method: 'POST',
      body: JSON.stringify(invoiceWithNIF)
    })
  }

  // Check invoice status
  async getInvoiceStatus(verifactuId: string): Promise<VeriFactuSubmissionResponse> {
    return this.request(`/status/${verifactuId}`)
  }

  // Cancel/modify invoice (for corrections)
  async cancelInvoice(verifactuId: string, reason: string): Promise<VeriFactuSubmissionResponse> {
    return this.request(`/cancel/${verifactuId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  }
}

export class VeriFactuAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors: VeriFactuError[]
  ) {
    super(message)
    this.name = 'VeriFactuAPIError'
  }
}

// Utility function to convert our Invoice type to VeriFactu format
export function convertToVeriFactuInvoice(
  invoice: any,
  companyNIF: string
): VeriFactuInvoice {
  // Calculate line items in VeriFactu format
  const lineas = invoice.line_items.map((item: any) => ({
    base_imponible: parseFloat((item.quantity * item.unit_price).toFixed(2)),
    tipo_impositivo: item.tax_rate,
    cuota_repercutida: parseFloat(((item.quantity * item.unit_price) * (item.tax_rate / 100)).toFixed(2)),
    descripcion: item.description,
    cantidad: item.quantity,
    precio_unitario: item.unit_price
  }))

  // Determine invoice type based on amount and client data
  let tipo_factura: VeriFactuInvoice['tipo_factura'] = 'F1'
  if (invoice.total < 3000 && (!invoice.client_tax_id || invoice.client_tax_id.trim() === '')) {
    tipo_factura = 'F2' // Simplified invoice under 3000€ without client tax ID
  }

  // Create a descriptive summary from line items
  const lineDescriptions = invoice.line_items
    .map((item: any) => `${item.description} (${item.quantity}x${item.unit_price}€)`)
    .join(', ')
  
  const descripcion = lineDescriptions.length > 0 
    ? lineDescriptions.substring(0, 500) // VeriFactu description limit
    : `Factura ${invoice.invoice_number} - ${invoice.client_name}`

  return {
    serie: invoice.serie || new Date().getFullYear().toString(),
    numero: invoice.numero.toString(),
    fecha_expedicion: formatDateForVeriFactu(invoice.issue_date),
    tipo_factura,
    descripcion,
    nif: invoice.client_tax_id || undefined,
    nombre: invoice.client_name,
    lineas,
    importe_total: parseFloat(invoice.total.toFixed(2)),
    fecha_operacion: formatDateForVeriFactu(invoice.issue_date),
    nif_emisor: companyNIF
  }
}

// Format date to DD-MM-YYYY as required by VeriFactu
function formatDateForVeriFactu(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}