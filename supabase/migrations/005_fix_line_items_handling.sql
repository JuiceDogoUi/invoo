-- Fix line items handling - ensure we use the separate table approach
-- This migration ensures the invoice creation handles line items properly

-- First, let's add the missing VeriFactu fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verifactu_api_key TEXT,
ADD COLUMN IF NOT EXISTS verifactu_nif_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_basque_country BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS basque_province TEXT CHECK (basque_province IN ('alava', 'guipuzcoa', 'vizcaya'));

-- Add missing VeriFactu fields to invoices table if they don't exist
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS verifactu_id TEXT,
ADD COLUMN IF NOT EXISTS verifactu_status TEXT,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'F1' CHECK (invoice_type IN ('F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5')),
ADD COLUMN IF NOT EXISTS serie TEXT,
ADD COLUMN IF NOT EXISTS numero INTEGER;

-- Add unique constraint for user + serie + numero
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_serie_numero_unique 
ON public.invoices(user_id, serie, numero);

-- Function to set invoice type automatically
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

-- Trigger to set invoice type
DROP TRIGGER IF EXISTS set_invoice_type_trigger ON public.invoices;
CREATE TRIGGER set_invoice_type_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_type();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_id ON public.invoices(verifactu_id) WHERE verifactu_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- Comments for documentation
COMMENT ON TABLE public.invoice_line_items IS 'Line items for invoices - separate table for proper normalization';
COMMENT ON COLUMN public.invoices.invoice_type IS 'Spanish invoice type: F1 (standard), F2 (simplified), R1-R5 (rectification)';
COMMENT ON COLUMN public.invoices.serie IS 'Invoice series (usually year)';
COMMENT ON COLUMN public.invoices.numero IS 'Sequential invoice number within series';