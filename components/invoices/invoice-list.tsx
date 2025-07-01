'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
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

export function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceWithLineItems[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithLineItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verifactuFilter, setVeriFactuFilter] = useState('all')

  useEffect(() => {
    fetchInvoices()
  }, [])

  // Filter invoices based on search and filter criteria
  useEffect(() => {
    let filtered = [...invoices]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.client_tax_id && invoice.client_tax_id.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    // VeriFactu filter
    if (verifactuFilter !== 'all') {
      if (verifactuFilter === 'with_verifactu') {
        filtered = filtered.filter(invoice => invoice.verifactu_id)
      } else if (verifactuFilter === 'without_verifactu') {
        filtered = filtered.filter(invoice => !invoice.verifactu_id)
      }
    }

    setFilteredInvoices(filtered)
  }, [invoices, searchTerm, statusFilter, verifactuFilter])

  const fetchInvoices = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Usuario no autenticado')
        return
      }

      // Fetch invoices for the current user
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          *,
          line_items:invoice_line_items(
            id,
            description,
            quantity,
            unit_price,
            tax_rate,
            total
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (invoicesError) {
        throw invoicesError
      }

      setInvoices(invoicesData || [])
      setFilteredInvoices(invoicesData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las facturas')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-blue-100 text-blue-800',
      submitted: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800'
    }

    const statusLabels = {
      draft: 'Borrador',
      pending: 'Pendiente',
      signed: 'Firmada',
      submitted: 'Enviada',
      paid: 'Pagada'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  const getVeriFactuBadge = (verifactu_id?: string, verifactu_status?: string) => {
    if (!verifactu_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Sin VeriFactu
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ VeriFactu
      </span>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error al cargar las facturas</div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchInvoices} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  if (invoices.length === 0 && !searchTerm && statusFilter === 'all' && verifactuFilter === 'all') {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay facturas aún
          </h3>
          <p className="text-gray-600 mb-4">
            Crea tu primera factura para comenzar
          </p>
          <Link href="/invoices/create">
            <Button>
              Crear Primera Factura
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          Mis Facturas ({filteredInvoices.length})
        </h2>
        <Button onClick={fetchInvoices} variant="outline" size="sm">
          Actualizar
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar facturas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="signed">Firmada</SelectItem>
              <SelectItem value="submitted">Enviada</SelectItem>
              <SelectItem value="paid">Pagada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={verifactuFilter} onValueChange={setVeriFactuFilter}>
            <SelectTrigger>
              <SelectValue placeholder="VeriFactu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="with_verifactu">Con VeriFactu</SelectItem>
              <SelectItem value="without_verifactu">Sin VeriFactu</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setVeriFactuFilter('all')
            }}
          >
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      {/* No results message */}
      {filteredInvoices.length === 0 && invoices.length > 0 && (
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron facturas
            </h3>
            <p className="text-gray-600 mb-4">
              Intenta ajustar los filtros de búsqueda
            </p>
            <Button 
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setVeriFactuFilter('all')
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {invoice.invoice_number}
                </h3>
                <p className="text-sm text-gray-600">
                  Cliente: {invoice.client_name}
                </p>
                {invoice.client_tax_id && (
                  <p className="text-sm text-gray-500">
                    NIF: {invoice.client_tax_id}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  €{invoice.total.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>

            {/* Line Items Summary */}
            {invoice.line_items && invoice.line_items.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Conceptos:</h4>
                <div className="space-y-1">
                  {invoice.line_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.description} ({item.quantity}x €{item.unit_price})
                      </span>
                      <span className="font-medium">
                        €{item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status and VeriFactu Badges */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                {getStatusBadge(invoice.status)}
                {getVeriFactuBadge(invoice.verifactu_id, invoice.verifactu_status)}
              </div>
              
              <div className="flex space-x-2">
                {invoice.verifactu_id && (
                  <a 
                    href={`https://www.verifacti.com/invoices/${invoice.verifactu_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Ver en VeriFactu
                  </a>
                )}
                
                <Link 
                  href={`/invoices/${invoice.id}`}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ver Detalles
                </Link>
              </div>
            </div>

            {/* VeriFactu Info */}
            {invoice.verifactu_id && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">VeriFactu ID:</span>
                    <span className="ml-2 text-gray-600 font-mono">
                      {invoice.verifactu_id.substring(0, 8)}...
                    </span>
                  </div>
                  {invoice.invoice_type && (
                    <div>
                      <span className="font-medium text-gray-700">Tipo:</span>
                      <span className="ml-2 text-gray-600">{invoice.invoice_type}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Info */}
            {invoice.last_submission_error && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-sm text-red-800">
                    <strong>Error de envío:</strong> {invoice.last_submission_error}
                  </div>
                  {invoice.submission_retry_count && invoice.submission_retry_count > 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      Intentos: {invoice.submission_retry_count}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}