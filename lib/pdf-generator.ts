import jsPDF from 'jspdf'
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

export async function generateInvoicePDF(invoice: InvoiceWithLineItems): Promise<Blob> {
  const pdf = new jsPDF()
  
  // Set font
  pdf.setFont('helvetica')
  
  // Company header
  pdf.setFontSize(20)
  pdf.setTextColor(40, 40, 40)
  pdf.text('FACTURA', 20, 30)
  
  // Invoice number and date
  pdf.setFontSize(12)
  pdf.text(`Número: ${invoice.invoice_number}`, 20, 45)
  pdf.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString('es-ES')}`, 20, 55)
  
  // VeriFactu info
  if (invoice.verifactu_id) {
    pdf.text(`VeriFactu ID: ${invoice.verifactu_id}`, 20, 65)
    pdf.text(`Tipo: ${invoice.invoice_type || 'F1'}`, 20, 75)
  }
  
  // Client information
  pdf.setFontSize(14)
  pdf.setTextColor(0, 0, 0)
  pdf.text('CLIENTE:', 20, 95)
  
  pdf.setFontSize(12)
  pdf.text(invoice.client_name, 20, 105)
  if (invoice.client_tax_id) {
    pdf.text(`NIF/CIF: ${invoice.client_tax_id}`, 20, 115)
  }
  if (invoice.client_address) {
    pdf.text(invoice.client_address, 20, 125)
  }
  if (invoice.client_email) {
    pdf.text(`Email: ${invoice.client_email}`, 20, 135)
  }
  
  // Line items table
  let yPosition = 155
  pdf.setFontSize(14)
  pdf.text('CONCEPTOS:', 20, yPosition)
  yPosition += 15
  
  // Table headers
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Descripción', 20, yPosition)
  pdf.text('Cant.', 110, yPosition)
  pdf.text('Precio', 130, yPosition)
  pdf.text('IVA', 155, yPosition)
  pdf.text('Total', 175, yPosition)
  
  yPosition += 5
  pdf.line(20, yPosition, 190, yPosition) // Table header line
  yPosition += 10
  
  // Line items
  pdf.setTextColor(0, 0, 0)
  if (invoice.line_items) {
    for (const item of invoice.line_items) {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 30
      }
      
      pdf.text(item.description.substring(0, 40), 20, yPosition)
      pdf.text(item.quantity.toString(), 110, yPosition)
      pdf.text(`€${item.unit_price.toFixed(2)}`, 130, yPosition)
      pdf.text(`${item.tax_rate}%`, 155, yPosition)
      pdf.text(`€${item.total.toFixed(2)}`, 175, yPosition)
      yPosition += 10
    }
  }
  
  // Totals
  yPosition += 10
  pdf.line(20, yPosition, 190, yPosition)
  yPosition += 15
  
  pdf.setFontSize(12)
  pdf.text(`Subtotal: €${invoice.subtotal.toFixed(2)}`, 130, yPosition)
  yPosition += 10
  pdf.text(`IVA: €${invoice.tax_amount.toFixed(2)}`, 130, yPosition)
  yPosition += 10
  
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`TOTAL: €${invoice.total.toFixed(2)}`, 130, yPosition)
  
  // QR Code for VeriFactu
  if (invoice.verifactu_id) {
    try {
      let qrData = invoice.qr_code_data
      
      // If no QR data or data is too large, generate AEAT-compliant URL
      if (!qrData || qrData.length > 500 || !qrData.startsWith('http')) {
        const params = new URLSearchParams({
          nif: invoice.client_tax_id || 'N/A',
          numserie: `${invoice.serie}${invoice.numero}`,
          fecha: new Date(invoice.issue_date).toLocaleDateString('es-ES'),
          importe: invoice.total.toFixed(2)
        })
        qrData = `https://preverifactu.aeat.es/verifactu?${params.toString()}`
      }
      
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 100,
        margin: 1
      })
      
      // Add QR code to PDF
      pdf.addImage(qrCodeDataURL, 'PNG', 20, yPosition + 20, 30, 30)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Código QR AEAT', 20, yPosition + 55)
      pdf.text('Verificación VeriFactu', 20, yPosition + 65)
    } catch (error) {
      console.error('Error generating QR code for PDF:', error)
      // Try fallback with basic AEAT URL
      try {
        const params = new URLSearchParams({
          nif: invoice.client_tax_id || 'N/A',
          numserie: `${invoice.serie}${invoice.numero}`,
          fecha: new Date(invoice.issue_date).toLocaleDateString('es-ES'),
          importe: invoice.total.toFixed(2)
        })
        const fallbackUrl = `https://preverifactu.aeat.es/verifactu?${params.toString()}`
        
        const qrCodeDataURL = await QRCode.toDataURL(fallbackUrl, {
          width: 100,
          margin: 1
        })
        
        pdf.addImage(qrCodeDataURL, 'PNG', 20, yPosition + 20, 30, 30)
        
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Código QR AEAT', 20, yPosition + 55)
        pdf.text('Verificación VeriFactu', 20, yPosition + 65)
      } catch (fallbackError) {
        console.error('Fallback QR code generation failed:', fallbackError)
      }
    }
  }
  
  // Compliance text
  pdf.setFontSize(8)
  pdf.setTextColor(100, 100, 100)
  pdf.text('Esta factura cumple con la normativa VeriFactu de la AEAT', 20, 280)
  pdf.text(`Generada el ${new Date().toLocaleDateString('es-ES')}`, 20, 285)
  
  return pdf.output('blob')
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}