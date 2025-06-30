-- ENTERPRISE VERIFACTU DATABASE SCHEMA
-- Comprehensive database support for bulletproof VeriFactu integration
-- Supports all enterprise features: chain tracking, webhooks, safeguards, TicketBAI

-- ============================================================================
-- 1. ENHANCE INVOICES TABLE FOR ENTERPRISE FEATURES
-- ============================================================================

-- Add missing enterprise VeriFactu fields
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS compliance_text TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS verifactu_hash TEXT,
ADD COLUMN IF NOT EXISTS verifactu_signature TEXT,
ADD COLUMN IF NOT EXISTS chain_position INTEGER,
ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.invoices(id),
ADD COLUMN IF NOT EXISTS is_rectification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rectification_type TEXT CHECK (rectification_type IN ('R1', 'R2', 'R3', 'R4', 'R5')),
ADD COLUMN IF NOT EXISTS ticketbai_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ticketbai_status TEXT,
ADD COLUMN IF NOT EXISTS ticketbai_id TEXT,
ADD COLUMN IF NOT EXISTS submission_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_error TEXT,
ADD COLUMN IF NOT EXISTS aeat_submission_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS webhook_notifications_sent INTEGER DEFAULT 0;

-- Add indexes for enterprise performance
CREATE INDEX IF NOT EXISTS idx_invoices_chain_position ON public.invoices(chain_position);
CREATE INDEX IF NOT EXISTS idx_invoices_parent_id ON public.invoices(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_rectification ON public.invoices(is_rectification) WHERE is_rectification = TRUE;
CREATE INDEX IF NOT EXISTS idx_invoices_status_date ON public.invoices(status, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_user_serie_numero ON public.invoices(user_id, serie, numero);

-- ============================================================================
-- 2. INVOICE CHAIN MANAGEMENT TABLES
-- ============================================================================

-- Invoice chain events for complete audit trail
CREATE TABLE IF NOT EXISTS public.invoice_chain_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'modified', 'cancelled', 'rectified')),
  verifactu_request JSONB NOT NULL,
  verifactu_response JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  parent_invoice_id UUID REFERENCES public.invoices(id),
  error_details TEXT,
  processing_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice relationships for chain tracking
CREATE TABLE IF NOT EXISTS public.invoice_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  related_invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('replaces', 'rectifies', 'cancels', 'modifies')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invoice_id, related_invoice_id, relationship_type)
);

-- Enable RLS
ALTER TABLE public.invoice_chain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_relationships ENABLE ROW LEVEL SECURITY;

-- Chain events policies
CREATE POLICY "Users can view own invoice chain events" ON public.invoice_chain_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_chain_events.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Relationships policies
CREATE POLICY "Users can view own invoice relationships" ON public.invoice_relationships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_relationships.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- Indexes for chain performance
CREATE INDEX IF NOT EXISTS idx_chain_events_invoice_id ON public.invoice_chain_events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_chain_events_type_status ON public.invoice_chain_events(event_type, status);
CREATE INDEX IF NOT EXISTS idx_relationships_invoice_id ON public.invoice_relationships(invoice_id);
CREATE INDEX IF NOT EXISTS idx_relationships_related_id ON public.invoice_relationships(related_invoice_id);

-- ============================================================================
-- 3. PRODUCTION SAFEGUARDS MONITORING
-- ============================================================================

-- Health metrics for production monitoring
CREATE TABLE IF NOT EXISTS public.verifactu_health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  api_response_time INTEGER NOT NULL, -- milliseconds
  error_rate DECIMAL(5,2) NOT NULL,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  queue_depth INTEGER NOT NULL DEFAULT 0,
  memory_usage_mb DECIMAL(10,2),
  cpu_usage DECIMAL(5,2),
  circuit_breaker_state TEXT CHECK (circuit_breaker_state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  rate_limit_hit BOOLEAN DEFAULT FALSE
);

-- API request tracking
CREATE TABLE IF NOT EXISTS public.verifactu_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  response_time_ms INTEGER,
  http_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.verifactu_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifactu_requests ENABLE ROW LEVEL SECURITY;

-- Health metrics policies (admin only)
CREATE POLICY "Admin can view health metrics" ON public.verifactu_health_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email LIKE '%@invoo.es'
    )
  );

-- Request tracking policies
CREATE POLICY "Users can view own requests" ON public.verifactu_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON public.verifactu_health_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_user_date ON public.verifactu_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_request_id ON public.verifactu_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_requests_status_date ON public.verifactu_requests(http_status, created_at);

-- ============================================================================
-- 4. WEBHOOK MANAGEMENT
-- ============================================================================

-- Webhook configurations
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  webhook_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  events TEXT[] NOT NULL DEFAULT ARRAY['invoice.created', 'invoice.modified', 'invoice.status_changed'],
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Webhook policies
CREATE POLICY "Users can manage own webhooks" ON public.webhook_configs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhook_configs 
      WHERE webhook_configs.id = webhook_deliveries.webhook_config_id 
      AND webhook_configs.user_id = auth.uid()
    )
  );

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhook_configs_user_active ON public.webhook_configs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config_id ON public.webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON public.webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ============================================================================
-- 5. TICKETBAI SUPPORT TABLES
-- ============================================================================

-- TicketBAI specific data
CREATE TABLE IF NOT EXISTS public.ticketbai_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL UNIQUE,
  province TEXT NOT NULL CHECK (province IN ('alava', 'guipuzcoa', 'vizcaya')),
  ticketbai_id TEXT NOT NULL,
  qr_code_data TEXT NOT NULL,
  signature TEXT NOT NULL,
  certificate_serial TEXT,
  submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected')),
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.ticketbai_invoices ENABLE ROW LEVEL SECURITY;

-- TicketBAI policies
CREATE POLICY "Users can view own TicketBAI invoices" ON public.ticketbai_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = ticketbai_invoices.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- TicketBAI indexes
CREATE INDEX IF NOT EXISTS idx_ticketbai_invoice_id ON public.ticketbai_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ticketbai_province_status ON public.ticketbai_invoices(province, status);

-- ============================================================================
-- 6. ENHANCED FUNCTIONS FOR ENTERPRISE FEATURES
-- ============================================================================

-- Function to validate invoice chain integrity
CREATE OR REPLACE FUNCTION validate_invoice_chain(invoice_uuid UUID)
RETURNS TABLE(is_valid BOOLEAN, errors TEXT[], chain_length INTEGER) AS $$
DECLARE
  current_chain_length INTEGER := 0;
  validation_errors TEXT[] := ARRAY[]::TEXT[];
  has_circular_ref BOOLEAN := FALSE;
BEGIN
  -- Calculate chain length
  WITH RECURSIVE chain_cte AS (
    SELECT id, parent_invoice_id, 1 as depth, ARRAY[id] as path
    FROM public.invoices 
    WHERE id = invoice_uuid
    
    UNION ALL
    
    SELECT i.id, i.parent_invoice_id, c.depth + 1, c.path || i.id
    FROM public.invoices i
    JOIN chain_cte c ON i.parent_invoice_id = c.id
    WHERE i.id <> ALL(c.path) AND c.depth < 50 -- Prevent infinite recursion
  )
  SELECT MAX(depth) INTO current_chain_length FROM chain_cte;
  
  -- Check for circular references
  IF current_chain_length >= 50 THEN
    validation_errors := validation_errors || 'Possible circular reference detected';
    has_circular_ref := TRUE;
  END IF;
  
  -- Check chain length limits
  IF current_chain_length > 10 THEN
    validation_errors := validation_errors || 'Chain length exceeds recommended maximum of 10';
  END IF;
  
  -- Return validation results
  RETURN QUERY SELECT 
    (array_length(validation_errors, 1) IS NULL), 
    validation_errors, 
    COALESCE(current_chain_length, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invoice statistics
CREATE OR REPLACE FUNCTION get_user_invoice_stats(user_uuid UUID)
RETURNS TABLE(
  total_invoices INTEGER,
  pending_invoices INTEGER,
  submitted_invoices INTEGER,
  total_amount DECIMAL(12,2),
  average_processing_time DECIMAL(10,2),
  success_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_invoices,
    COUNT(*) FILTER (WHERE status IN ('draft', 'pending'))::INTEGER as pending_invoices,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'signed'))::INTEGER as submitted_invoices,
    COALESCE(SUM(total), 0) as total_amount,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000)::DECIMAL(10,2) as average_processing_time,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status IN ('submitted', 'signed', 'paid'))::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END as success_rate
  FROM public.invoices 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old health metrics (for performance)
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only last 7 days of metrics
  DELETE FROM public.verifactu_health_metrics 
  WHERE timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record health metric
CREATE OR REPLACE FUNCTION record_health_metric(
  response_time INTEGER,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  queue_depth INTEGER DEFAULT 0,
  memory_usage DECIMAL DEFAULT NULL,
  circuit_state TEXT DEFAULT 'CLOSED'
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
  error_rate DECIMAL;
BEGIN
  -- Calculate error rate
  IF (success_count + failure_count) > 0 THEN
    error_rate := (failure_count::DECIMAL / (success_count + failure_count)::DECIMAL) * 100;
  ELSE
    error_rate := 0;
  END IF;
  
  INSERT INTO public.verifactu_health_metrics (
    api_response_time,
    error_rate,
    successful_requests,
    failed_requests,
    queue_depth,
    memory_usage_mb,
    circuit_breaker_state
  ) VALUES (
    response_time,
    error_rate,
    success_count,
    failure_count,
    queue_depth,
    memory_usage,
    circuit_state
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. UPDATED TRIGGERS AND CONSTRAINTS
-- ============================================================================

-- Enhanced invoice type setting with enterprise rules
CREATE OR REPLACE FUNCTION set_enterprise_invoice_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Preserve explicit rectification types
  IF NEW.is_rectification = TRUE AND NEW.rectification_type IS NOT NULL THEN
    NEW.invoice_type := NEW.rectification_type;
  -- F2 for simplified invoices under 3,000€ without client tax ID
  ELSIF NEW.total < 3000 AND (NEW.client_tax_id IS NULL OR NEW.client_tax_id = '') THEN
    NEW.invoice_type := 'F2';
  -- F1 for standard invoices
  ELSE
    NEW.invoice_type := COALESCE(NEW.invoice_type, 'F1');
  END IF;
  
  -- Set TicketBAI requirement based on user profile
  SELECT is_basque_country INTO NEW.ticketbai_required
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace existing trigger
DROP TRIGGER IF EXISTS set_invoice_type_trigger ON public.invoices;
CREATE TRIGGER set_enterprise_invoice_type_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION set_enterprise_invoice_type();

-- Add constraint to ensure invoice chain integrity
ALTER TABLE public.invoices 
ADD CONSTRAINT check_no_self_reference 
CHECK (id != parent_invoice_id);

-- ============================================================================
-- 8. PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_status_date ON public.invoices(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_verifactu_status ON public.invoices(verifactu_status) WHERE verifactu_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chain_events_invoice_type ON public.invoice_chain_events(invoice_id, event_type, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON public.invoices(user_id, created_at) WHERE status IN ('draft', 'pending');
CREATE INDEX IF NOT EXISTS idx_invoices_failed_retries ON public.invoices(submission_retry_count) WHERE submission_retry_count > 0;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.invoice_chain_events IS 'Complete audit trail of all VeriFactu operations for compliance';
COMMENT ON TABLE public.invoice_relationships IS 'Invoice relationship tracking for chain validation';
COMMENT ON TABLE public.verifactu_health_metrics IS 'Production monitoring and health metrics';
COMMENT ON TABLE public.verifactu_requests IS 'Detailed API request tracking for debugging';
COMMENT ON TABLE public.webhook_configs IS 'User webhook configuration for real-time notifications';
COMMENT ON TABLE public.webhook_deliveries IS 'Webhook delivery log with retry tracking';
COMMENT ON TABLE public.ticketbai_invoices IS 'TicketBAI specific data for Basque Country compliance';

COMMENT ON COLUMN public.invoices.qr_code_data IS 'AEAT-compliant QR code data for invoice verification';
COMMENT ON COLUMN public.invoices.compliance_text IS 'Mandatory VeriFactu compliance text for invoices';
COMMENT ON COLUMN public.invoices.chain_position IS 'Position in invoice modification chain';
COMMENT ON COLUMN public.invoices.parent_invoice_id IS 'Reference to parent invoice in chain';
COMMENT ON COLUMN public.invoices.submission_retry_count IS 'Number of submission retry attempts';

-- ============================================================================
-- END OF ENTERPRISE VERIFACTU SCHEMA
-- ============================================================================