export interface User {
  id: string
  email: string
  full_name?: string
  company_name?: string
  tax_id?: string
  address?: string
  phone?: string
  is_basque_country?: boolean
  basque_province?: 'alava' | 'guipuzcoa' | 'vizcaya'
  verifactu_api_key?: string
  verifactu_nif_activated?: boolean
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  client_name: string
  client_email?: string
  client_address?: string
  client_tax_id?: string
  issue_date: string
  due_date?: string
  subtotal: number
  tax_amount: number
  total: number
  notes?: string
  status: 'draft' | 'pending' | 'signed' | 'submitted' | 'paid'
  verifactu_hash?: string
  verifactu_signature?: string
  verifactu_id?: string
  verifactu_status?: 'pending' | 'processing' | 'accepted' | 'rejected' | 'cancelled' | 'error'
  aeat_submitted?: boolean
  invoice_type?: 'F1' | 'F2' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'F3'
  serie?: string
  numero?: number
  line_items?: InvoiceLineItem[]
  created_at: string
  updated_at: string
  
  // Enterprise VeriFactu features
  qr_code_data?: string
  compliance_text?: string
  pdf_url?: string
  chain_position?: number
  parent_invoice_id?: string
  is_rectification?: boolean
  rectification_type?: 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
  ticketbai_required?: boolean
  ticketbai_status?: string
  ticketbai_id?: string
  submission_retry_count?: number
  last_submission_error?: string
  aeat_submission_date?: string
  webhook_notifications_sent?: number
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total: number
}

export interface VeriFactuResponse {
  hash: string
  signature: string
  qr_code_url: string
  pdf_url?: string
  status: string
  verifactu_id: string
}

// VeriFactu API specific types (exact API specification)
export interface VeriFactuInvoice {
  serie: string
  numero: string // Changed from number to string per API docs
  fecha_expedicion: string // Format: DD-MM-YYYY
  tipo_factura: 'F1' | 'F2' | 'F3' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
  descripcion: string // MANDATORY: Operation description (1-500 chars)
  
  // Recipient identification (conditional based on invoice type)
  nif?: string // Spanish tax ID
  nombre?: string // Recipient name
  
  // Alternative recipient identification for international
  id_otro?: {
    codigo_pais: string // Country code
    id_type: string // Document type code  
    id: string // Identifier
  }
  
  lineas: VeriFactuLineItem[]
  importe_total: number
  
  // Optional fields
  fecha_operacion?: string // Operation date (DD-MM-YYYY)
  nif_emisor?: string // Company NIF (added by API client)
  provincia?: 'alava' | 'guipuzcoa' | 'vizcaya' // For TicketBAI
  
  // Rectification invoice specific fields
  tipo_rectificativa?: 'S' | 'I' // S=Substitution, I=Difference
  facturas_rectificadas?: Array<{
    serie: string
    numero: string
    fecha_expedicion: string
  }>
}

export interface VeriFactuLineItem {
  // Exact API field names
  base_imponible: number // MANDATORY: Taxable base
  tipo_impositivo: number // MANDATORY: Tax rate percentage (0, 4, 10, 21)
  cuota_repercutida: number // MANDATORY: Tax amount calculated
  
  // Optional descriptive fields
  descripcion?: string // Line description
  cantidad?: number // Quantity
  precio_unitario?: number // Unit price
}

export interface VeriFactuSubmissionResponse {
  id: string
  hash: string
  signature: string
  qr_code_url: string
  pdf_url?: string
  status: 'pending' | 'processing' | 'submitted' | 'accepted' | 'rejected' | 'cancelled' | 'error'
  aeat_submission_id?: string
  errors?: VeriFactuError[]
}

export interface VeriFactuError {
  code: string
  message: string
  field?: string
}

// VeriFactu Status Constants
export const VERIFACTU_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ERROR: 'error'
} as const

export const VERIFACTU_STATUS_LABELS = {
  pending: 'Pendiente',
  processing: 'Procesando',
  submitted: 'Enviado',
  accepted: 'Correcta',
  rejected: 'Rechazada',
  cancelled: 'Anulada',
  error: 'Error'
} as const

export const VERIFACTU_STATUS_ICONS = {
  pending: '⏳',
  processing: '🔄',
  submitted: '📤',
  accepted: '✅',
  rejected: '❌',
  cancelled: '🚫',
  error: '⚠️'
} as const

export type VeriFactuStatus = keyof typeof VERIFACTU_STATUS_LABELS

// Utility functions for VeriFactu status handling
export function mapVeriFactuApiStatus(apiStatus: string): VeriFactuStatus {
  const statusMap: Record<string, VeriFactuStatus> = {
    'Pendiente': 'pending',
    'Correcta': 'accepted',
    'Procesando': 'processing',
    'Enviado': 'submitted',
    'Rechazada': 'rejected',
    'Anulada': 'cancelled',
    'Error': 'error'
  }
  return statusMap[apiStatus] || ('error' as VeriFactuStatus)
}

export function getVeriFactuStatusLabel(status: VeriFactuStatus): string {
  return VERIFACTU_STATUS_LABELS[status] || status
}

export function getVeriFactuStatusIcon(status: VeriFactuStatus): string {
  return VERIFACTU_STATUS_ICONS[status] || '❓'
}

export interface VeriFactuSubmission {
  id: string
  invoice_id: string
  submission_type: 'create' | 'modify' | 'cancel'
  verifactu_request_data: any
  verifactu_response_data?: any
  status: 'pending' | 'processing' | 'submitted' | 'accepted' | 'rejected' | 'error'
  error_message?: string
  submitted_at: string
  processed_at?: string
}

// Spanish tax rates
export const SPANISH_TAX_RATES = {
  STANDARD: 21, // IVA General
  REDUCED: 10,  // IVA Reducido
  SUPER_REDUCED: 4, // IVA Superreducido
  EXEMPT: 0     // Exento
} as const

// Invoice types for Spanish compliance
export const INVOICE_TYPES = {
  F1: 'Factura estándar',
  F2: 'Factura simplificada (< 3000€)',
  F3: 'Factura resumen',
  R1: 'Rectificativa por error en datos',
  R2: 'Rectificativa por artículo 80.1',
  R3: 'Rectificativa por artículo 80.2',
  R4: 'Rectificativa por artículo 80.3',
  R5: 'Rectificativa por artículo 80.4 y 80.6'
} as const

// ============================================================================
// ENTERPRISE VERIFACTU TYPES
// ============================================================================

// Invoice Chain Management
export interface InvoiceChainEvent {
  id: string
  invoice_id: string
  event_type: 'created' | 'modified' | 'cancelled' | 'rectified'
  verifactu_request: any
  verifactu_response?: any
  status: 'pending' | 'success' | 'failed'
  parent_invoice_id?: string
  error_details?: string
  processing_time_ms?: number
  retry_count: number
  created_at: string
}

export interface InvoiceRelationship {
  id: string
  invoice_id: string
  related_invoice_id: string
  relationship_type: 'replaces' | 'rectifies' | 'cancels' | 'modifies'
  created_at: string
}

// Production Safeguards & Monitoring
export interface VeriFactuHealthMetric {
  id: string
  timestamp: string
  api_response_time: number
  error_rate: number
  successful_requests: number
  failed_requests: number
  queue_depth: number
  memory_usage_mb?: number
  cpu_usage?: number
  circuit_breaker_state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  rate_limit_hit: boolean
}

export interface VeriFactuRequest {
  id: string
  request_id: string
  user_id?: string
  invoice_id?: string
  endpoint: string
  method: string
  request_data?: any
  response_data?: any
  response_time_ms?: number
  http_status?: number
  error_code?: string
  error_message?: string
  retry_attempt: number
  created_at: string
  completed_at?: string
}

// Webhook Management
export interface WebhookConfig {
  id: string
  user_id: string
  webhook_url: string
  secret_key: string
  is_active: boolean
  events: string[]
  failure_count: number
  last_success_at?: string
  last_failure_at?: string
  created_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_config_id: string
  invoice_id?: string
  event_type: string
  payload: any
  response_status?: number
  response_body?: string
  delivery_time_ms?: number
  retry_count: number
  delivered_at: string
  next_retry_at?: string
}

// TicketBAI Support
export interface TicketBAIInvoice {
  id: string
  invoice_id: string
  province: 'alava' | 'guipuzcoa' | 'vizcaya'
  ticketbai_id: string
  qr_code_data: string
  signature: string
  certificate_serial?: string
  submission_date: string
  status: 'submitted' | 'accepted' | 'rejected'
  rejection_reason?: string
}

// Enhanced VeriFactu Response with Enterprise Features
export interface EnhancedVeriFactuResponse extends VeriFactuSubmissionResponse {
  qr_code_data?: string
  compliance_text?: string
  chain_position?: number
  processing_time_ms?: number
  retry_count?: number
}

// Chain Validation Result
export interface ChainValidationResult {
  is_valid: boolean
  errors: string[]
  chain_length: number
}

// User Statistics
export interface UserInvoiceStats {
  total_invoices: number
  pending_invoices: number
  submitted_invoices: number
  total_amount: number
  average_processing_time: number
  success_rate: number
}

// System Health Status
export interface SystemHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  issues: string[]
  metrics: {
    avgResponseTime: number
    errorRate: number
    requestsPerMinute: number
  }
  safeguards: {
    circuitBreakerState: string
    rateLimitUsage: any
    canaryMode: boolean
  }
}

// Master Client Configuration
export interface MasterClientConfig {
  apiKey: string
  nif: string
  isProduction?: boolean
  enableChainTracking?: boolean
  enableWebhooks?: boolean
  webhookSecret?: string
  enableSafeguards?: boolean
}

// Processing Result from Master Client
export interface ProcessingResult {
  success: boolean
  response?: EnhancedVeriFactuResponse
  error?: any
  chainEvent?: InvoiceChainEvent
  safeguardWarnings?: string[]
}