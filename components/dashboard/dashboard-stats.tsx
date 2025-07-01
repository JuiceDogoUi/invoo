'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, Clock, Euro } from 'lucide-react'

interface DashboardStatsData {
  totalInvoices: number
  verifactuSigned: number
  pending: number
  totalAmount: number
  thisMonthAmount: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalInvoices: 0,
    verifactuSigned: 0,
    pending: 0,
    totalAmount: 0,
    thisMonthAmount: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get all user invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      if (!invoices) {
        setLoading(false)
        return
      }

      // Calculate stats
      const totalInvoices = invoices.length
      const verifactuSigned = invoices.filter(inv => inv.verifactu_id).length
      const pending = invoices.filter(inv => 
        inv.status === 'draft' || inv.status === 'pending' || !inv.verifactu_id
      ).length
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

      // This month amount
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const thisMonthAmount = invoices
        .filter(inv => {
          const invoiceDate = new Date(inv.issue_date)
          return invoiceDate.getMonth() === currentMonth && 
                 invoiceDate.getFullYear() === currentYear
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0)

      setStats({
        totalInvoices,
        verifactuSigned,
        pending,
        totalAmount,
        thisMonthAmount
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Facturas
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalInvoices}</div>
          <p className="text-xs text-muted-foreground">
            Límite gratuito: 5/mes
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Firmadas VeriFactu
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.verifactuSigned}</div>
          <p className="text-xs text-muted-foreground">
            Certificadas digitalmente
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pendientes
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">
            Sin enviar a AEAT
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Facturado
          </CardTitle>
          <Euro className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{stats.thisMonthAmount.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Este mes
          </p>
        </CardContent>
      </Card>
    </div>
  )
}