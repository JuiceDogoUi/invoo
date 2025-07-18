import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { VeriFactuApiSetup } from '@/components/verifactu/api-setup'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
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
              Configuración
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure sus credenciales y preferencias para VeriFactu
            </p>
          </div>
          
          <VeriFactuApiSetup />
        </div>
      </main>
    </div>
  )
}