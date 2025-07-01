import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { InvoiceEditForm } from '@/components/invoices/invoice-edit-form'

export const dynamic = 'force-dynamic'

interface InvoiceEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const resolvedParams = await params
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Fetch invoice with line items
  const { data: invoice, error } = await supabase
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
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id)
    .single()

  if (error || !invoice) {
    notFound()
  }

  // Don't allow editing if already submitted to VeriFactu
  if (invoice.verifactu_id && invoice.status !== 'draft') {
    redirect(`/invoices/${resolvedParams.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Editar Factura {invoice.invoice_number}
          </h1>
          <p className="text-gray-600">
            Modifica los datos de tu factura
          </p>
        </div>
        
        <InvoiceEditForm invoice={invoice} />
      </div>
    </div>
  )
}