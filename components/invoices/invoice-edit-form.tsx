'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NIFInput } from '@/components/ui/nif-input'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import type { Invoice } from '@/types'

interface InvoiceWithLineItems extends Omit<Invoice, 'line_items'> {
  line_items?: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    total: number
  }>
}

interface InvoiceEditFormProps {
  invoice: InvoiceWithLineItems
}

interface LineItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total: number
}

export function InvoiceEditForm({ invoice }: InvoiceEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state
  const [clientName, setClientName] = useState(invoice.client_name)
  const [clientTaxId, setClientTaxId] = useState(invoice.client_tax_id || '')
  const [clientAddress, setClientAddress] = useState(invoice.client_address || '')
  const [clientEmail, setClientEmail] = useState(invoice.client_email || '')
  const [notes, setNotes] = useState(invoice.notes || '')
  
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice.line_items?.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      total: item.total
    })) || []
  )

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 21,
      total: 0
    }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      const item = updated[index]
      const subtotal = item.quantity * item.unit_price
      const taxAmount = subtotal * (item.tax_rate / 100)
      updated[index].total = subtotal + taxAmount
    }
    
    setLineItems(updated)
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)
    
    const taxAmount = lineItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price
      return sum + (itemSubtotal * (item.tax_rate / 100))
    }, 0)
    
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const totals = calculateTotals()
      
      const invoiceData = {
        client_name: clientName,
        client_tax_id: clientTaxId || null,
        client_address: clientAddress || null,
        client_email: clientEmail || null,
        notes: notes || null,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total: totals.total,
        line_items: lineItems
      }

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      if (response.ok) {
        router.push(`/invoices/${invoice.id}`)
        router.refresh()
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      alert('Error al actualizar la factura')
    } finally {
      setIsLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        
        <Button type="submit" disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {/* Client Information */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Información del Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Nombre del Cliente *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="clientTaxId">NIF/CIF</Label>
            <NIFInput
              value={clientTaxId}
              onChange={(value) => setClientTaxId(value)}
            />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="clientAddress">Dirección</Label>
            <Textarea
              id="clientAddress"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              rows={2}
            />
          </div>
          
          <div>
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Conceptos</h2>
          <Button type="button" onClick={addLineItem} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Concepto
          </Button>
        </div>
        
        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-12 md:col-span-4">
                <Label>Descripción</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Descripción del producto/servicio"
                  required
                />
              </div>
              
              <div className="col-span-3 md:col-span-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="col-span-3 md:col-span-2">
                <Label>Precio Unit.</Label>
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="col-span-3 md:col-span-2">
                <Label>IVA (%)</Label>
                <Select 
                  value={item.tax_rate.toString()} 
                  onValueChange={(value) => updateLineItem(index, 'tax_rate', parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <Label>Total</Label>
                <p className="text-sm font-medium mt-2">€{item.total.toFixed(2)}</p>
              </div>
              
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Totals */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Totales</h2>
        <div className="space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>€{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA:</span>
            <span>€{totals.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span>€{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Notas</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales para la factura..."
          rows={3}
        />
      </Card>
    </form>
  )
}