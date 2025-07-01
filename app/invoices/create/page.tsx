import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvoiceCreationForm } from '@/components/invoices/invoice-creation-form'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

export const dynamic = 'force-dynamic'

export default async function CreateInvoicePage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Crear Nueva Factura
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Complete los datos para generar una factura con cumplimiento VeriFactu
            </p>
          </div>
          
          <InvoiceCreationForm />
        </div>
      </main>
    </div>
  )
}