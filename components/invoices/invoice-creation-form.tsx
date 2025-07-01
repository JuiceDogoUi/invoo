'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SPANISH_TAX_RATES } from '@/types'
import { NIFInput } from '@/components/ui/nif-input'
import type { Invoice, InvoiceLineItem } from '@/types'

interface InvoiceFormData {
  client_name: string
  client_email: string
  client_address: string
  client_tax_id: string
  issue_date: string
  due_date: string
  line_items: Omit<InvoiceLineItem, 'id' | 'invoice_id'>[]
}

export function InvoiceCreationForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_address: '',
    client_tax_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    line_items: [
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: SPANISH_TAX_RATES.STANDARD,
        total: 0
      }
    ]
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const calculateLineItemTotal = (item: Omit<InvoiceLineItem, 'id' | 'invoice_id'>) => {
    const subtotal = item.quantity * item.unit_price
    const taxAmount = subtotal * (item.tax_rate / 100)
    return subtotal + taxAmount
  }

  const updateLineItem = (index: number, field: keyof Omit<InvoiceLineItem, 'id' | 'invoice_id'>, value: any) => {
    const newLineItems = [...formData.line_items]
    newLineItems[index] = { ...newLineItems[index], [field]: value }
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      newLineItems[index].total = calculateLineItemTotal(newLineItems[index])
    }
    
    setFormData({ ...formData, line_items: newLineItems })
  }

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: SPANISH_TAX_RATES.STANDARD,
          total: 0
        }
      ]
    })
  }

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index)
    })
  }


  const calculateTotals = () => {
    const subtotal = formData.line_items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)
    
    const taxAmount = formData.line_items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price * item.tax_rate / 100)
    }, 0)
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round((subtotal + taxAmount) * 100) / 100
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      const totals = calculateTotals()
      
      // Generate invoice number (simple sequential for now)
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('numero')
        .eq('user_id', user.id)
        .order('numero', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (lastInvoice?.numero || 0) + 1

      // Create invoice using API with VeriFactu integration
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: formData.client_name,
          client_email: formData.client_email || null,
          client_address: formData.client_address || null,
          client_tax_id: formData.client_tax_id || null,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total: totals.total,
          line_items: formData.line_items
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la factura')
      }

      const { invoice } = result

      // Show success message and redirect
      setSuccess('¡Factura creada exitosamente! Redirigiendo...')
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
      // Reset form
      setFormData({
        client_name: '',
        client_email: '',
        client_address: '',
        client_tax_id: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        line_items: [
          {
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: SPANISH_TAX_RATES.STANDARD,
            total: 0
          }
        ]
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la factura')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totals = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Client Information */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre/Razón Social *
            </label>
            <Input
              type="text"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NIF/CIF
              <span className="text-xs text-gray-500 ml-1">
                (Opcional - Usa A15022510 para pruebas o déjalo vacío)
              </span>
            </label>
            <NIFInput
              value={formData.client_tax_id}
              onChange={(value) => setFormData({ ...formData, client_tax_id: value })}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <Input
              type="text"
              value={formData.client_address}
              onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Invoice Dates */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fechas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Emisión *
            </label>
            <Input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Vencimiento
            </label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Líneas de Factura</h3>
        
        {formData.line_items.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-4 items-end">
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <Input
                type="text"
                value={item.description}
                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                required
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unit.
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={item.unit_price}
                onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IVA %
              </label>
              <select
                value={item.tax_rate}
                onChange={(e) => updateLineItem(index, 'tax_rate', parseFloat(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={SPANISH_TAX_RATES.EXEMPT}>0% (Exento)</option>
                <option value={SPANISH_TAX_RATES.SUPER_REDUCED}>4% (Superreducido)</option>
                <option value={SPANISH_TAX_RATES.REDUCED}>10% (Reducido)</option>
                <option value={SPANISH_TAX_RATES.STANDARD}>21% (General)</option>
              </select>
            </div>
            
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                €{item.total.toFixed(2)}
              </div>
            </div>
            
            <div className="col-span-1">
              {formData.line_items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={addLineItem}
          className="mb-4"
        >
          + Añadir Línea
        </Button>
      </Card>

      {/* Totals */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Totales</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Base imponible:</span>
            <span>€{totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA:</span>
            <span>€{totals.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>€{totals.total.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={isSubmitting || !formData.client_name || formData.line_items.some(item => !item.description)}
          className="px-8"
        >
          {isSubmitting ? 'Creando...' : 'Crear Factura'}
        </Button>
      </div>
    </form>
  )
}