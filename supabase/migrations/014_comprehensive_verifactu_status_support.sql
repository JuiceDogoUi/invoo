-- Migration: Comprehensive VeriFactu status support and sync
-- File: 014_comprehensive_verifactu_status_support.sql
-- Purpose: Ensure all Verifacti invoice states are supported and properly mapped
-- Date: 2025-07-01

-- First, let's see current verifactu_status values in the database
SELECT 
  'Current VeriFactu Status Values in Database' as info;

SELECT DISTINCT 
  verifactu_status,
  COUNT(*) as count
FROM invoices 
WHERE verifactu_status IS NOT NULL
GROUP BY verifactu_status;

-- Add proper constraint for verifactu_status field
-- This ensures only valid status values are stored
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS check_verifactu_status;

ALTER TABLE public.invoices 
ADD CONSTRAINT check_verifactu_status 
CHECK (verifactu_status IS NULL OR verifactu_status IN (
  'pending',     -- Pendiente (submitted to Verifacti, waiting for AEAT)
  'processing',  -- Procesando (being processed by AEAT)  
  'accepted',    -- Correcta (accepted by AEAT)
  'rejected',    -- Rechazada (rejected by AEAT)
  'cancelled',   -- Anulada (cancelled invoice)
  'error'        -- Error (submission or processing error)
));

-- Add invoice sync status tracking
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS verifactu_last_sync TIMESTAMP WITH TIME ZONE;

-- Add verifactu UUID from API responses
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS verifactu_uuid TEXT;

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_status 
ON public.invoices(verifactu_status) 
WHERE verifactu_status IS NOT NULL;

-- Create index for sync tracking
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_sync 
ON public.invoices(verifactu_last_sync) 
WHERE verifactu_last_sync IS NOT NULL;

-- Add comments explaining the status mapping
COMMENT ON COLUMN public.invoices.verifactu_status IS 
'VeriFactu invoice status mapped from Spanish API responses:
- pending: "Pendiente" (submitted to Verifacti, waiting for AEAT processing)
- processing: "Procesando" (being processed by AEAT)
- accepted: "Correcta" (accepted and registered by AEAT)
- rejected: "Rechazada" (rejected by AEAT due to validation errors)
- cancelled: "Anulada" (cancelled invoice)
- error: Error in submission or processing';

COMMENT ON COLUMN public.invoices.verifactu_uuid IS 
'UUID returned by Verifacti API for invoice tracking and status queries';

COMMENT ON COLUMN public.invoices.verifactu_last_sync IS 
'Timestamp of last status sync with Verifacti API';

-- Create a view for user-friendly status display
CREATE OR REPLACE VIEW invoice_status_view AS
SELECT 
  i.*,
  CASE 
    WHEN i.verifactu_status = 'pending' THEN 'Pendiente de procesamiento'
    WHEN i.verifactu_status = 'processing' THEN 'Procesando en AEAT'
    WHEN i.verifactu_status = 'accepted' THEN 'Aceptada por AEAT'
    WHEN i.verifactu_status = 'rejected' THEN 'Rechazada por AEAT'
    WHEN i.verifactu_status = 'cancelled' THEN 'Factura anulada'
    WHEN i.verifactu_status = 'error' THEN 'Error en procesamiento'
    WHEN i.verifactu_id IS NOT NULL THEN 'Estado desconocido'
    ELSE 'Sin enviar a VeriFactu'
  END as verifactu_status_display,
  CASE 
    WHEN i.verifactu_status = 'accepted' THEN '✅'
    WHEN i.verifactu_status = 'pending' THEN '⏳'
    WHEN i.verifactu_status = 'processing' THEN '🔄'
    WHEN i.verifactu_status = 'rejected' THEN '❌'
    WHEN i.verifactu_status = 'cancelled' THEN '🚫'
    WHEN i.verifactu_status = 'error' THEN '⚠️'
    WHEN i.verifactu_id IS NOT NULL THEN '❓'
    ELSE '➖'
  END as verifactu_status_icon
FROM invoices i;

-- Function to map Spanish API responses to internal status codes
CREATE OR REPLACE FUNCTION map_verifactu_status(api_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE api_status
    WHEN 'Pendiente' THEN 'pending'
    WHEN 'Correcta' THEN 'accepted'
    WHEN 'Procesando' THEN 'processing'
    WHEN 'Rechazada' THEN 'rejected'
    WHEN 'Anulada' THEN 'cancelled'
    WHEN 'Error' THEN 'error'
    ELSE LOWER(api_status)
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get Spanish display label from internal status
CREATE OR REPLACE FUNCTION get_verifactu_status_label(internal_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE internal_status
    WHEN 'pending' THEN 'Pendiente'
    WHEN 'accepted' THEN 'Correcta'
    WHEN 'processing' THEN 'Procesando'
    WHEN 'rejected' THEN 'Rechazada'
    WHEN 'cancelled' THEN 'Anulada'
    WHEN 'error' THEN 'Error'
    ELSE COALESCE(internal_status, 'Sin estado')
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Show the status mapping for verification
SELECT 
  'VeriFactu Status Mapping' as info;

SELECT 
  'Spanish API Response' as api_response,
  'Internal Status Code' as internal_code,
  'Display Label' as display_label,
  'Icon' as icon;

SELECT 
  'Pendiente' as api_response,
  map_verifactu_status('Pendiente') as internal_code,
  get_verifactu_status_label('pending') as display_label,
  '⏳' as icon

UNION ALL SELECT 'Correcta', map_verifactu_status('Correcta'), get_verifactu_status_label('accepted'), '✅'
UNION ALL SELECT 'Procesando', map_verifactu_status('Procesando'), get_verifactu_status_label('processing'), '🔄'  
UNION ALL SELECT 'Rechazada', map_verifactu_status('Rechazada'), get_verifactu_status_label('rejected'), '❌'
UNION ALL SELECT 'Anulada', map_verifactu_status('Anulada'), get_verifactu_status_label('cancelled'), '🚫'
UNION ALL SELECT 'Error', map_verifactu_status('Error'), get_verifactu_status_label('error'), '⚠️';

-- Test the new status system
SELECT 
  'Status system ready for VeriFactu sync' as result,
  'All Verifacti states now supported' as note;