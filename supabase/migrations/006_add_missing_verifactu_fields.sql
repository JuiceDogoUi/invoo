-- Add missing VeriFactu fields for complete integration
-- This migration adds the essential VeriFactu fields that were missing from the initial schema

-- ============================================================================
-- 1. ADD MISSING VERIFACTU FIELDS TO PROFILES TABLE
-- ============================================================================

-- Add VeriFactu API credentials and configuration fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verifactu_api_key TEXT,
ADD COLUMN IF NOT EXISTS verifactu_nif_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_basque_country BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS basque_province TEXT CHECK (basque_province IN ('alava', 'guipuzcoa', 'vizcaya'));

-- ============================================================================
-- 2. ADD MISSING VERIFACTU FIELDS TO INVOICES TABLE
-- ============================================================================

-- Add essential VeriFactu fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS verifactu_id TEXT,
ADD COLUMN IF NOT EXISTS verifactu_status TEXT,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'F1' CHECK (invoice_type IN ('F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5')),
ADD COLUMN IF NOT EXISTS serie TEXT,
ADD COLUMN IF NOT EXISTS numero INTEGER,
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS compliance_text TEXT,
ADD COLUMN IF NOT EXISTS submission_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_error TEXT,
ADD COLUMN IF NOT EXISTS aeat_submission_date TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 3. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Add unique constraint for user + serie + numero to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_serie_numero_unique 
ON public.invoices(user_id, serie, numero);

-- Add indexes for better VeriFactu query performance
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_id ON public.invoices(verifactu_id) WHERE verifactu_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_status ON public.invoices(verifactu_status) WHERE verifactu_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- Add index for invoice type filtering
CREATE INDEX IF NOT EXISTS idx_invoices_type_status ON public.invoices(invoice_type, status);

-- ============================================================================
-- 4. AUTOMATIC INVOICE TYPE DETECTION FUNCTION
-- ============================================================================

-- Function to automatically set invoice type based on Spanish tax rules
CREATE OR REPLACE FUNCTION set_invoice_type()
RETURNS TRIGGER AS $$
BEGIN
  -- F2 for simplified invoices under 3,000€ without client tax ID
  IF NEW.total < 3000 AND (NEW.client_tax_id IS NULL OR NEW.client_tax_id = '') THEN
    NEW.invoice_type := 'F2';
  -- F1 for standard invoices
  ELSE
    NEW.invoice_type := COALESCE(NEW.invoice_type, 'F1');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGER FOR AUTOMATIC INVOICE TYPE SETTING
-- ============================================================================

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS set_invoice_type_trigger ON public.invoices;
CREATE TRIGGER set_invoice_type_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_type();

-- ============================================================================
-- 6. ADD HELPFUL COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.profiles.verifactu_api_key IS 'VeriFactu API key for digital signature and AEAT submission';
COMMENT ON COLUMN public.profiles.is_basque_country IS 'Whether user is in Basque Country (requires TicketBAI)';
COMMENT ON COLUMN public.profiles.basque_province IS 'Basque province for TicketBAI compliance';

COMMENT ON COLUMN public.invoices.verifactu_id IS 'Unique identifier from VeriFactu API response';
COMMENT ON COLUMN public.invoices.invoice_type IS 'Spanish invoice type: F1 (standard), F2 (simplified), R1-R5 (rectification)';
COMMENT ON COLUMN public.invoices.serie IS 'Invoice series (usually year)';
COMMENT ON COLUMN public.invoices.numero IS 'Sequential invoice number within series';
COMMENT ON COLUMN public.invoices.qr_code_data IS 'AEAT-compliant QR code data for invoice verification';
COMMENT ON COLUMN public.invoices.submission_retry_count IS 'Number of VeriFactu submission retry attempts';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================