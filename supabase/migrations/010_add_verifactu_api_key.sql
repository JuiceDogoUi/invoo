-- Migration: Add VeriFactu API key to test user profile
-- File: 010_add_verifactu_api_key.sql
-- Purpose: Configure Verifacti API key for manucrk@gmail.com to enable VeriFactu submissions
-- Date: 2025-07-01

-- Update profile with correct Verifacti API key and complete test company data
UPDATE profiles 
SET 
  verifactu_api_key = 'vf_test_QcFzP3Y0pVCIj2SIlMIT7Nv2l8ebBU6gPvWJhzt9WzE=',
  company_name = 'Empresa de prueba SL',
  tax_id = 'B75777847',
  address = 'Calle Mayor, 16, 28013 Madrid',
  verifactu_nif_activated = true,
  updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'manucrk@gmail.com'
);

-- Verify the update
SELECT 
  u.email,
  p.company_name,
  p.tax_id,
  p.verifactu_api_key,
  p.verifactu_nif_activated,
  CASE 
    WHEN p.verifactu_api_key IS NOT NULL AND p.tax_id IS NOT NULL 
    THEN '✅ VeriFactu Ready' 
    ELSE '❌ Missing Credentials' 
  END as status
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'manucrk@gmail.com';

-- Show what will happen on next invoice creation
DO $$
DECLARE
  has_api_key BOOLEAN;
  has_tax_id BOOLEAN;
BEGIN
  SELECT 
    (verifactu_api_key IS NOT NULL),
    (tax_id IS NOT NULL)
  INTO has_api_key, has_tax_id
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE u.email = 'manucrk@gmail.com';
  
  IF has_api_key AND has_tax_id THEN
    RAISE NOTICE 'SUCCESS: Next invoice creation will attempt VeriFactu submission';
    RAISE NOTICE 'API Key: Present';
    RAISE NOTICE 'Tax ID: B75777847';
    RAISE NOTICE 'Company: Empresa de prueba SL';
  ELSE
    RAISE NOTICE 'WARNING: VeriFactu submission will be skipped';
    RAISE NOTICE 'API Key Present: %', has_api_key;
    RAISE NOTICE 'Tax ID Present: %', has_tax_id;
  END IF;
END $$;