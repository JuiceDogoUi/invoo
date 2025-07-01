'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Edit, Trash2, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
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

interface InvoiceDetailViewProps {
  invoice: InvoiceWithLineItems
}

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const generateQRCode = async () => {
      if (invoice.qr_code_data) {
        try {
          // Check if qr_code_data is already a URL or needs to be generated
          let qrData = invoice.qr_code_data
          
          // If the data seems too large or not a URL, generate AEAT-compliant QR URL
          if (qrData.length > 500 || !qrData.startsWith('http')) {
            // Generate AEAT-compliant QR URL format
            const params = new URLSearchParams({
              nif: invoice.client_tax_id || 'N/A',
              numserie: `${invoice.serie}${invoice.numero}`,
              fecha: new Date(invoice.issue_date).toLocaleDateString('es-ES'),
              importe: invoice.total.toFixed(2)
            })
            qrData = `https://preverifactu.aeat.es/verifactu?${params.toString()}`
          }
          
          const dataUrl = await QRCode.toDataURL(qrData, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          setQrCodeDataUrl(dataUrl)
        } catch (error) {
          console.error('Error generating QR code:', error)
          // Fallback: try to generate basic AEAT URL
          try {
            const params = new URLSearchParams({
              nif: invoice.client_tax_id || 'N/A',
              numserie: `${invoice.serie}${invoice.numero}`,
              fecha: new Date(invoice.issue_date).toLocaleDateString('es-ES'),
              importe: invoice.total.toFixed(2)
            })
            const fallbackUrl = `https://preverifactu.aeat.es/verifactu?${params.toString()}`
            const dataUrl = await QRCode.toDataURL(fallbackUrl, {
              width: 150,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            })
            setQrCodeDataUrl(dataUrl)
          } catch (fallbackError) {
            console.error('Fallback QR code generation failed:', fallbackError)
          }
        }
      }
    }

    generateQRCode()
  }, [invoice.qr_code_data, invoice.client_tax_id, invoice.serie, invoice.numero, invoice.issue_date, invoice.total])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' as const },
      pending: { label: 'Pendiente', variant: 'outline' as const },
      signed: { label: 'Firmada', variant: 'default' as const },
      submitted: { label: 'Enviada', variant: 'default' as const },
      paid: { label: 'Pagada', variant: 'default' as const }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta factura?')) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        alert('Error al eliminar la factura')
      }
    } catch (error) {
      alert('Error al eliminar la factura')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Factura-${invoice.invoice_number}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert('Error al generar PDF')
      }
    } catch (error) {
      alert('Error al generar PDF')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {invoice.invoice_number}
                </h1>
                <p className="text-sm text-gray-600">
                  {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getStatusBadge(invoice.status)}
              {invoice.verifactu_id && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✓ VeriFactu
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid gap-6">
          {/* Invoice Actions */}
          <Card className="p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Acciones</h2>
              <div className="flex space-x-2">
                <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button 
                  onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                  variant="outline" 
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  onClick={handleDelete}
                  variant="destructive" 
                  size="sm"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
                {invoice.verifactu_id && (
                  <a 
                    href={`https://www.verifacti.com/invoices/${invoice.verifactu_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver en VeriFactu
                  </a>
                )}
              </div>
            </div>
          </Card>

          {/* Client Information */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Información del Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <p className="text-gray-900">{invoice.client_name}</p>
              </div>
              {invoice.client_tax_id && (
                <div>
                  <label className="text-sm font-medium text-gray-700">NIF/CIF</label>
                  <p className="text-gray-900">{invoice.client_tax_id}</p>
                </div>
              )}
              {invoice.client_address && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Dirección</label>
                  <p className="text-gray-900">{invoice.client_address}</p>
                </div>
              )}
              {invoice.client_email && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{invoice.client_email}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Conceptos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Descripción</th>
                    <th className="text-right py-2">Cantidad</th>
                    <th className="text-right py-2">Precio Unit.</th>
                    <th className="text-right py-2">IVA</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items?.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3">{item.description}</td>
                      <td className="text-right py-3">{item.quantity}</td>
                      <td className="text-right py-3">€{item.unit_price.toFixed(2)}</td>
                      <td className="text-right py-3">{item.tax_rate}%</td>
                      <td className="text-right py-3 font-medium">€{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Totals */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Totales</h2>
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>€{invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA:</span>
                <span>€{invoice.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>€{invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* VeriFactu Information */}
          {invoice.verifactu_id && (
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Información VeriFactu</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">VeriFactu ID</label>
                      <p className="text-gray-900 font-mono text-sm">{invoice.verifactu_id}</p>
                    </div>
                    {invoice.invoice_type && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Tipo de Factura</label>
                        <p className="text-gray-900">{invoice.invoice_type}</p>
                      </div>
                    )}
                    {invoice.verifactu_status && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estado VeriFactu</label>
                        <p className="text-gray-900">{invoice.verifactu_status}</p>
                      </div>
                    )}
                    {invoice.aeat_submission_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Fecha Envío AEAT</label>
                        <p className="text-gray-900">
                          {new Date(invoice.aeat_submission_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* QR Code Section */}
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-gray-700 mb-2">Código QR AEAT</label>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code para verificación AEAT" 
                      className="border border-gray-200 rounded"
                    />
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Escanea para verificar en AEAT
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Error Information */}
          {invoice.last_submission_error && (
            <Card className="p-6 border-red-200 bg-red-50">
              <h2 className="text-lg font-medium mb-4 text-red-800">Error de Envío</h2>
              <p className="text-red-700 mb-2">{invoice.last_submission_error}</p>
              {invoice.submission_retry_count && invoice.submission_retry_count > 0 && (
                <p className="text-sm text-red-600">
                  Número de intentos: {invoice.submission_retry_count}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}