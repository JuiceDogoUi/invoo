'use client'

import { AuthForm } from '@/components/auth/auth-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Invoo.es</h1>
          <p className="text-gray-600">Facturación VeriFactu para Autónomos</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Sesión</CardTitle>
            <CardDescription>
              Accede a tu cuenta con tu email. Te enviaremos un enlace mágico para iniciar sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm />
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>¿Primera vez? El enlace mágico creará tu cuenta automáticamente.</p>
        </div>
      </div>
    </div>
  )
}