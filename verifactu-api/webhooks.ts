/**
 * VeriFactu Webhooks API
 * Handles webhook configuration and real-time invoice status notifications
 */

import crypto from 'crypto'

export interface WebhookConfig {
  url: string
  secret?: string
  nifs?: string[]
  activo?: boolean
}

export interface WebhookResponse {
  id: string
  url: string
  secret?: string
  nifs: string[]
  activo: boolean
  fecha_creacion: string
  fecha_modificacion?: string
}

export interface WebhookPayload {
  uuid: string
  nif: string
  serie: string
  numero: string
  fecha_envio: string
  estado: 'pending' | 'correct' | 'accepted_with_errors' | 'incorrect' | 'error'
  errores?: Array<{
    codigo: string
    mensaje: string
  }>
  hash?: string
  qr_code_url?: string
  pdf_url?: string
}

export interface WebhookEvent {
  timestamp: string
  invoices: WebhookPayload[]
  signature?: string
}

export class WebhooksAPI {
  private apiKey: string
  private baseUrl: string
  private isProduction: boolean

  constructor(apiKey: string, isProduction = false) {
    this.apiKey = apiKey
    this.baseUrl = isProduction 
      ? 'https://api.verifacti.com' 
      : 'https://api-test.verifacti.com'
    this.isProduction = isProduction
  }

  private async makeRequest<T>(endpoint: string, method = 'GET', data?: any): Promise<T> {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Webhook API Error: ${result.error || response.statusText}`)
    }

    return result
  }

  // Webhook Management Operations
  async createWebhook(config: WebhookConfig): Promise<WebhookResponse> {
    return this.makeRequest<WebhookResponse>('/webhooks', 'POST', config)
  }

  async listWebhooks(): Promise<WebhookResponse[]> {
    return this.makeRequest<WebhookResponse[]>('/webhooks')
  }

  async getWebhook(webhookId: string): Promise<WebhookResponse> {
    return this.makeRequest<WebhookResponse>(`/webhooks/${webhookId}`)
  }

  async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<WebhookResponse> {
    return this.makeRequest<WebhookResponse>(`/webhooks/${webhookId}`, 'PUT', config)
  }

  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/webhooks/${webhookId}`, 'DELETE')
  }

  async activateWebhook(webhookId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/webhooks/${webhookId}/activate`, 'PUT')
  }

  async deactivateWebhook(webhookId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/webhooks/${webhookId}/deactivate`, 'PUT')
  }

  // NIF Association Management
  async addNIFToWebhook(webhookId: string, nif: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/webhooks/${webhookId}/nifs/${nif}`, 'POST')
  }

  async removeNIFFromWebhook(webhookId: string, nif: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(`/webhooks/${webhookId}/nifs/${nif}`, 'DELETE')
  }

  // Webhook Security and Validation
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = WebhooksAPI.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  static parseWebhookEvent(request: {
    body: string
    headers: { [key: string]: string }
  }): WebhookEvent {
    try {
      const event: WebhookEvent = JSON.parse(request.body)
      
      // Add signature from headers if present
      const signature = request.headers['x-webhook-signature']
      if (signature) {
        event.signature = signature
      }
      
      return event
    } catch (error) {
      throw new Error(`Invalid webhook payload: ${error}`)
    }
  }

  // Validation
  validateWebhookConfig(config: WebhookConfig): string[] {
    const errors: string[] = []

    if (!config.url || !config.url.trim()) {
      errors.push('Webhook URL is required')
    }

    try {
      new URL(config.url)
    } catch {
      errors.push('Webhook URL must be a valid URL')
    }

    if (!config.url.startsWith('https://')) {
      errors.push('Webhook URL must use HTTPS')
    }

    if (config.nifs && config.nifs.length === 0) {
      errors.push('At least one NIF must be specified if NIFs array is provided')
    }

    return errors
  }

  // Utility Methods for Event Processing
  async processWebhookEvent(
    event: WebhookEvent, 
    secret?: string,
    onInvoiceUpdate?: (payload: WebhookPayload) => Promise<void>
  ): Promise<void> {
    // Verify signature if secret is provided
    if (secret && event.signature) {
      const isValid = WebhooksAPI.verifySignature(
        JSON.stringify({ timestamp: event.timestamp, invoices: event.invoices }),
        event.signature,
        secret
      )
      
      if (!isValid) {
        throw new Error('Invalid webhook signature')
      }
    }

    // Process each invoice update
    for (const invoice of event.invoices) {
      try {
        if (onInvoiceUpdate) {
          await onInvoiceUpdate(invoice)
        }
        
        // Log the event for audit purposes
        console.log(`Invoice ${invoice.serie}-${invoice.numero} status: ${invoice.estado}`)
        
        if (invoice.errores && invoice.errores.length > 0) {
          console.error(`Invoice ${invoice.serie}-${invoice.numero} errors:`, invoice.errores)
        }
      } catch (error) {
        console.error(`Error processing webhook for invoice ${invoice.uuid}:`, error)
      }
    }
  }

  // Helper method to create a webhook URL for Next.js API routes
  static createWebhookHandler(
    secret?: string,
    onInvoiceUpdate?: (payload: WebhookPayload) => Promise<void>
  ) {
    return async (req: any, res: any) => {
      try {
        if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' })
        }

        const event = WebhooksAPI.parseWebhookEvent({
          body: req.body,
          headers: req.headers
        })

        const webhooksAPI = new WebhooksAPI('') // API key not needed for processing
        await webhooksAPI.processWebhookEvent(event, secret, onInvoiceUpdate)

        res.status(200).json({ success: true })
      } catch (error) {
        console.error('Webhook processing error:', error)
        res.status(400).json({ error: (error as Error).message })
      }
    }
  }
}

export const webhooksAPI = new WebhooksAPI(
  process.env.VERIFACTU_NIFS_API_KEY || '',
  process.env.NODE_ENV === 'production'
)