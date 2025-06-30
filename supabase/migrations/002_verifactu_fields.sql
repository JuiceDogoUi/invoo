-- Add VeriFactu-specific fields to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS verifactu_id TEXT,
ADD COLUMN IF NOT EXISTS verifactu_status TEXT,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'F1' CHECK (invoice_type IN ('F1', 'F2', 'R1', 'R2', 'R3', 'R4', 'R5', 'F3')),
ADD COLUMN IF NOT EXISTS serie TEXT DEFAULT 'A',
ADD COLUMN IF NOT EXISTS numero INTEGER;

-- Update existing invoices to have proper serie and numero
UPDATE public.invoices 
SET 
  serie = COALESCE(SPLIT_PART(invoice_number, '-', 1), 'A'),
  numero = COALESCE(NULLIF(SPLIT_PART(invoice_number, '-', 2), '')::INTEGER, 1)
WHERE serie IS NULL OR numero IS NULL;

-- Add index for faster VeriFactu lookups
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_id ON public.invoices(verifactu_id);
CREATE INDEX IF NOT EXISTS idx_invoices_serie_numero ON public.invoices(serie, numero);

-- Add VeriFactu submission log table for audit trail
CREATE TABLE IF NOT EXISTS public.verifactu_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('create', 'modify', 'cancel')),
  verifactu_request_data JSONB NOT NULL,
  verifactu_response_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'submitted', 'accepted', 'rejected', 'error')),
  error_message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on submissions
ALTER TABLE public.verifactu_submissions ENABLE ROW LEVEL SECURITY;

-- Create submissions policies
CREATE POLICY "Users can view own VeriFactu submissions" ON public.verifactu_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = verifactu_submissions.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Add updated_at trigger to submissions
CREATE TRIGGER update_verifactu_submissions_updated_at BEFORE UPDATE ON public.verifactu_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update invoice line items to support VeriFactu tax types
ALTER TABLE public.invoice_line_items 
ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'S1' CHECK (tax_type IN ('S1', 'S2', 'S3', 'E', 'NS'));

-- Set tax_type based on existing tax_rate
UPDATE public.invoice_line_items 
SET tax_type = CASE 
  WHEN tax_rate = 21 THEN 'S1'
  WHEN tax_rate = 10 THEN 'S2'
  WHEN tax_rate = 4 THEN 'S3'
  WHEN tax_rate = 0 THEN 'E'
  ELSE 'S1'
END
WHERE tax_type IS NULL;

-- Add function to automatically set invoice type based on total
CREATE OR REPLACE FUNCTION set_invoice_type()
RETURNS TRIGGER AS $$
BEGIN
  -- F2 for simplified invoices under 400€
  IF NEW.total < 400 THEN
    NEW.invoice_type = 'F2';
  ELSE
    NEW.invoice_type = COALESCE(NEW.invoice_type, 'F1');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically set invoice type
DROP TRIGGER IF EXISTS set_invoice_type_trigger ON public.invoices;
CREATE TRIGGER set_invoice_type_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_type();

-- Add function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(user_uuid UUID, invoice_serie TEXT DEFAULT 'A')
RETURNS TEXT AS $$
DECLARE
  next_numero INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get the next number for this user and serie
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO next_numero
  FROM public.invoices 
  WHERE user_id = user_uuid AND serie = invoice_serie;
  
  -- Format as SERIE-NUMBER
  invoice_number := invoice_serie || '-' || next_numero::TEXT;
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;