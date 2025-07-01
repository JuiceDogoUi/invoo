import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { InvoiceList } from '@/components/invoices/invoice-list'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
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
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              ¡Bienvenido a Invoo.es!
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestiona tus facturas con cumplimiento VeriFactu
            </p>
          </div>
          
          <DashboardStats />
          
          {/* Quick Actions */}
          <div className="mb-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Gestiona tus facturas con VeriFactu!
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea, firma y gestiona tus facturas con cumplimiento automático VeriFactu.
                </p>
                
                <div className="flex justify-center space-x-4">
                  <Link
                    href="/invoices/create"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Crear Nueva Factura
                  </Link>
                  
                  <Link
                    href="/settings"
                    className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Configuración VeriFactu
                  </Link>
                </div>
                
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center">
                    <span className="text-green-500 mr-1">✅</span>
                    Autenticación
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-green-500 mr-1">✅</span>
                    Creación facturas
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-green-500 mr-1">✅</span>
                    VeriFactu API
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-yellow-500 mr-1">🚧</span>
                    PDF con QR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice List */}
          <InvoiceList />
        </div>
      </main>
    </div>
  )
}