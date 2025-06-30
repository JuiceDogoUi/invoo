/**
 * INVOICE CHAIN MANAGER
 * Handles invoice relationships, modifications, and audit trail
 * Ensures compliance with VeriFactu chaining requirements
 */

export interface InvoiceChainEvent {
  id: string
  invoice_id: string
  event_type: 'created' | 'modified' | 'cancelled' | 'rectified'
  verifactu_request: any
  verifactu_response: any
  status: 'pending' | 'success' | 'failed'
  timestamp: Date
  parent_invoice_id?: string
  error_details?: string
}

export interface InvoiceRelationship {
  invoice_id: string
  related_invoice_id: string
  relationship_type: 'replaces' | 'rectifies' | 'cancels' | 'modifies'
  created_at: Date
}

export interface ChainValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  chainLength: number
  relationships: InvoiceRelationship[]
}

export class InvoiceChainManager {
  private chainEvents: Map<string, InvoiceChainEvent[]> = new Map()
  private relationships: Map<string, InvoiceRelationship[]> = new Map()

  // Record a new chain event
  recordEvent(event: Omit<InvoiceChainEvent, 'id' | 'timestamp'>): InvoiceChainEvent {
    const chainEvent: InvoiceChainEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    }

    // Add to chain
    const existingEvents = this.chainEvents.get(event.invoice_id) || []
    existingEvents.push(chainEvent)
    this.chainEvents.set(event.invoice_id, existingEvents)

    // Record relationship if applicable
    if (event.parent_invoice_id) {
      this.recordRelationship({
        invoice_id: event.invoice_id,
        related_invoice_id: event.parent_invoice_id,
        relationship_type: this.eventTypeToRelationship(event.event_type),
        created_at: new Date()
      })
    }

    return chainEvent
  }

  // Record invoice relationship
  private recordRelationship(relationship: InvoiceRelationship): void {
    const existing = this.relationships.get(relationship.invoice_id) || []
    existing.push(relationship)
    this.relationships.set(relationship.invoice_id, existing)

    // Also record reverse relationship for easy lookup
    const reverse = this.relationships.get(relationship.related_invoice_id) || []
    reverse.push({
      ...relationship,
      invoice_id: relationship.related_invoice_id,
      related_invoice_id: relationship.invoice_id,
      relationship_type: this.reverseRelationshipType(relationship.relationship_type)
    })
    this.relationships.set(relationship.related_invoice_id, reverse)
  }

  // Get complete chain for an invoice
  getInvoiceChain(invoiceId: string): InvoiceChainEvent[] {
    return this.chainEvents.get(invoiceId) || []
  }

  // Get all relationships for an invoice
  getInvoiceRelationships(invoiceId: string): InvoiceRelationship[] {
    return this.relationships.get(invoiceId) || []
  }

  // Validate a proposed chain operation
  validateChainOperation(
    invoiceId: string,
    operationType: InvoiceChainEvent['event_type'],
    targetInvoiceId?: string
  ): ChainValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const relationships = this.getInvoiceRelationships(invoiceId)
    const chainLength = this.calculateChainLength(invoiceId)

    // Validate chain length limits
    if (chainLength > 10) {
      errors.push(`Invoice chain too long (${chainLength}). Maximum recommended: 10`)
    }

    // Validate operation-specific rules
    switch (operationType) {
      case 'modified':
        if (this.hasBeenCancelled(invoiceId)) {
          errors.push('Cannot modify a cancelled invoice')
        }
        if (this.getModificationCount(invoiceId) >= 5) {
          warnings.push('Invoice has been modified many times. Consider creating a rectification instead.')
        }
        break

      case 'cancelled':
        if (this.hasBeenCancelled(invoiceId)) {
          errors.push('Invoice is already cancelled')
        }
        if (this.hasActiveRectifications(invoiceId)) {
          warnings.push('Cancelling invoice with active rectifications')
        }
        break

      case 'rectified':
        if (!targetInvoiceId) {
          errors.push('Target invoice ID required for rectification')
        } else {
          if (this.hasBeenCancelled(targetInvoiceId)) {
            errors.push('Cannot rectify a cancelled invoice')
          }
          if (this.isCircularReference(invoiceId, targetInvoiceId)) {
            errors.push('Circular reference detected in invoice chain')
          }
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      chainLength,
      relationships
    }
  }

  // Check if invoice has been cancelled
  private hasBeenCancelled(invoiceId: string): boolean {
    const events = this.getInvoiceChain(invoiceId)
    return events.some(event => 
      event.event_type === 'cancelled' && event.status === 'success'
    )
  }

  // Count modifications
  private getModificationCount(invoiceId: string): number {
    const events = this.getInvoiceChain(invoiceId)
    return events.filter(event => 
      event.event_type === 'modified' && event.status === 'success'
    ).length
  }

  // Check for active rectifications
  private hasActiveRectifications(invoiceId: string): boolean {
    const relationships = this.getInvoiceRelationships(invoiceId)
    return relationships.some(rel => 
      rel.relationship_type === 'rectifies' && !this.hasBeenCancelled(rel.invoice_id)
    )
  }

  // Calculate total chain length
  private calculateChainLength(invoiceId: string, visited: Set<string> = new Set()): number {
    if (visited.has(invoiceId)) {
      return 0 // Avoid infinite loops
    }
    visited.add(invoiceId)

    const relationships = this.getInvoiceRelationships(invoiceId)
    let maxLength = 1

    for (const rel of relationships) {
      if (rel.relationship_type === 'replaces' || rel.relationship_type === 'rectifies') {
        const childLength = this.calculateChainLength(rel.related_invoice_id, new Set(visited))
        maxLength = Math.max(maxLength, 1 + childLength)
      }
    }

    return maxLength
  }

  // Check for circular references
  private isCircularReference(startId: string, targetId: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(targetId)) {
      return true
    }
    if (targetId === startId) {
      return true
    }

    visited.add(targetId)
    const relationships = this.getInvoiceRelationships(targetId)
    
    for (const rel of relationships) {
      if (rel.relationship_type === 'replaces' || rel.relationship_type === 'rectifies') {
        if (this.isCircularReference(startId, rel.related_invoice_id, new Set(visited))) {
          return true
        }
      }
    }

    return false
  }

  // Generate unique event ID
  private generateEventId(): string {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Convert event type to relationship type
  private eventTypeToRelationship(eventType: InvoiceChainEvent['event_type']): InvoiceRelationship['relationship_type'] {
    switch (eventType) {
      case 'modified': return 'modifies'
      case 'cancelled': return 'cancels'
      case 'rectified': return 'rectifies'
      default: return 'replaces'
    }
  }

  // Get reverse relationship type
  private reverseRelationshipType(type: InvoiceRelationship['relationship_type']): InvoiceRelationship['relationship_type'] {
    switch (type) {
      case 'replaces': return 'replaces'
      case 'rectifies': return 'rectifies'
      case 'cancels': return 'cancels'
      case 'modifies': return 'modifies'
      default: return 'replaces'
    }
  }

  // Get chain statistics
  getChainStatistics(): {
    totalChains: number
    averageChainLength: number
    longestChain: number
    totalEvents: number
    eventsByType: Record<string, number>
  } {
    let totalEvents = 0
    let totalLength = 0
    let longestChain = 0
    const eventsByType: Record<string, number> = {}

    for (const [invoiceId, events] of this.chainEvents) {
      totalEvents += events.length
      const chainLength = this.calculateChainLength(invoiceId)
      totalLength += chainLength
      longestChain = Math.max(longestChain, chainLength)

      events.forEach(event => {
        eventsByType[event.event_type] = (eventsByType[event.event_type] || 0) + 1
      })
    }

    return {
      totalChains: this.chainEvents.size,
      averageChainLength: this.chainEvents.size > 0 ? totalLength / this.chainEvents.size : 0,
      longestChain,
      totalEvents,
      eventsByType
    }
  }

  // Export chain data for persistence
  exportChainData(): {
    events: InvoiceChainEvent[]
    relationships: InvoiceRelationship[]
  } {
    const allEvents: InvoiceChainEvent[] = []
    const allRelationships: InvoiceRelationship[] = []

    for (const events of this.chainEvents.values()) {
      allEvents.push(...events)
    }

    for (const relationships of this.relationships.values()) {
      allRelationships.push(...relationships)
    }

    return {
      events: allEvents,
      relationships: allRelationships
    }
  }

  // Import chain data
  importChainData(data: { events: InvoiceChainEvent[], relationships: InvoiceRelationship[] }): void {
    // Clear existing data
    this.chainEvents.clear()
    this.relationships.clear()

    // Import events
    data.events.forEach(event => {
      const existing = this.chainEvents.get(event.invoice_id) || []
      existing.push(event)
      this.chainEvents.set(event.invoice_id, existing)
    })

    // Import relationships
    data.relationships.forEach(relationship => {
      const existing = this.relationships.get(relationship.invoice_id) || []
      existing.push(relationship)
      this.relationships.set(relationship.invoice_id, existing)
    })
  }

  // Clear all chain data (for testing/reset)
  clearAllChains(): void {
    this.chainEvents.clear()
    this.relationships.clear()
  }
}

// Singleton instance
export const invoiceChainManager = new InvoiceChainManager()