'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface ApiSetupProps {
  onSetupComplete?: () => void
}

export function VeriFactuApiSetup(props: ApiSetupProps = {}) {
  const { onSetupComplete } = props
  const [formData, setFormData] = useState({
    verifactu_api_key: '',
    tax_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      // Update user profile with VeriFactu credentials
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verifactu_api_key: formData.verifactu_api_key,
          tax_id: formData.tax_id
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess('Credenciales de VeriFactu guardadas correctamente')
      onSetupComplete?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar las credenciales')
    } finally {
      setIsSubmitting(false)
    }
  }

  const testConnection = async () => {
    if (!formData.verifactu_api_key || !formData.tax_id) {
      setError('Por favor, complete todos los campos antes de probar la conexión')
      return
    }

    setIsTestingConnection(true)
    setError(null)
    setConnectionStatus('idle')

    try {
      // First save the credentials
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('Usuario no autenticado')
      }

      await supabase
        .from('profiles')
        .update({
          verifactu_api_key: formData.verifactu_api_key,
          tax_id: formData.tax_id
        })
        .eq('id', user.id)

      // Test the connection
      const response = await fetch('/api/verifactu/health')
      const result = await response.json()

      if (response.ok) {
        setConnectionStatus('success')
        setSuccess(`Conexión exitosa con VeriFactu. Entorno: ${result.verifactu.environment}`)
      } else {
        setConnectionStatus('error')
        setError(result.error || 'Error al conectar con VeriFactu')
      }

    } catch (err) {
      setConnectionStatus('error')
      setError(err instanceof Error ? err.message : 'Error al probar la conexión')
    } finally {
      setIsTestingConnection(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configuración de VeriFactu
        </h3>
        <p className="text-sm text-gray-600">
          Configure sus credenciales de VeriFactu para habilitar la firma digital automática de facturas.
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="font-medium text-blue-900 mb-2">¿Cómo obtener las credenciales?</h4>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Regístrese en <a href="https://www.verifacti.com" target="_blank" rel="noopener noreferrer" className="underline">www.verifacti.com</a></li>
          <li>2. Registre su NIF/CIF en el panel de control</li>
          <li>3. Obtenga su API key de pruebas</li>
          <li>4. Copie las credenciales en los campos de abajo</li>
        </ol>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NIF/CIF de su empresa *
          </label>
          <Input
            type="text"
            value={formData.tax_id}
            onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
            placeholder="12345678A"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            El NIF/CIF que registró en VeriFactu
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key de VeriFactu *
          </label>
          <Input
            type="password"
            value={formData.verifactu_api_key}
            onChange={(e) => setFormData({ ...formData, verifactu_api_key: e.target.value })}
            placeholder="vf_test_..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            La API key que obtuvo de su panel de VeriFactu
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={isTestingConnection || !formData.verifactu_api_key || !formData.tax_id}
          >
            {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>

        {connectionStatus === 'success' && (
          <div className="flex items-center text-green-600 text-sm">
            <span className="mr-2">✅</span>
            Conexión con VeriFactu verificada
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="flex items-center text-red-600 text-sm">
            <span className="mr-2">❌</span>
            Error de conexión con VeriFactu
          </div>
        )}
      </form>
    </Card>
  )
}