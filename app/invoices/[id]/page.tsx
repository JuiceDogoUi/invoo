import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view'

export const dynamic = 'force-dynamic'

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
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

  return <InvoiceDetailView invoice={invoice} />
}