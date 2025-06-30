import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'

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
          
          <div className="mt-8 bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tu panel de control está listo
                </h3>
                <p className="text-gray-600 mb-6">
                  Aquí podrás crear, firmar y gestionar tus facturas con certificación VeriFactu.
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>✅ Autenticación configurada</p>
                  <p>🚧 Creación de facturas (próximamente)</p>
                  <p>🚧 Firma digital VeriFactu (próximamente)</p>
                  <p>🚧 Exportación PDF con QR (próximamente)</p>
                  <p>🚧 Envío a AEAT (próximamente)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}