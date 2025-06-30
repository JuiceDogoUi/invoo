-- Update invoice type function based on VeriFactu documentation
-- F2 simplified invoices are allowed up to 3,000€, not 400€

CREATE OR REPLACE FUNCTION set_invoice_type()
RETURNS TRIGGER AS $$
BEGIN
  -- F2 for simplified invoices under 3,000€ (updated from 400€)
  -- Also consider if client has no tax ID (simplified invoice requirement)
  IF NEW.total < 3000 AND (NEW.client_tax_id IS NULL OR NEW.client_tax_id = '') THEN
    NEW.invoice_type = 'F2';
  -- F1 for standard invoices (with client tax ID or over 3,000€)
  ELSE
    NEW.invoice_type = COALESCE(NEW.invoice_type, 'F1');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing invoices that might need reclassification
UPDATE public.invoices 
SET invoice_type = CASE 
  WHEN total < 3000 AND (client_tax_id IS NULL OR client_tax_id = '') THEN 'F2'
  ELSE 'F1'
END
WHERE invoice_type IS NULL OR (invoice_type = 'F2' AND total >= 400);

-- Add company profile fields for VeriFactu compliance
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_basque_country BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS basque_province TEXT CHECK (basque_province IN ('alava', 'guipuzcoa', 'vizcaya')),
ADD COLUMN IF NOT EXISTS verifactu_api_key TEXT,
ADD COLUMN IF NOT EXISTS verifactu_nif_activated BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.is_basque_country IS 'True if user operates in Basque Country and needs TicketBAI';
COMMENT ON COLUMN public.profiles.basque_province IS 'Specific Basque province for TicketBAI compliance';
COMMENT ON COLUMN public.profiles.verifactu_api_key IS 'User VeriFactu API key (encrypted)';
COMMENT ON COLUMN public.profiles.verifactu_nif_activated IS 'Whether the NIF is activated in VeriFactu system';

-- Add function to check if invoice needs TicketBAI
CREATE OR REPLACE FUNCTION needs_ticket_bai(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_basque BOOLEAN;
BEGIN
  SELECT is_basque_country INTO is_basque
  FROM public.profiles 
  WHERE id = user_uuid;
  
  RETURN COALESCE(is_basque, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance on VeriFactu lookups
CREATE INDEX IF NOT EXISTS idx_profiles_verifactu ON public.profiles(verifactu_nif_activated) WHERE verifactu_nif_activated = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_basque ON public.profiles(is_basque_country) WHERE is_basque_country = TRUE;