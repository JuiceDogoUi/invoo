-- Migration: Update test user profile with VeriFactu test company data
-- File: 007_update_test_user_profile.sql
-- Purpose: Configure manucrk@gmail.com account with official VeriFactu test company data
-- Date: 2025-07-01

-- Update profile for manucrk@gmail.com with VeriFactu test company data
-- Using official VeriFactu test NIF: B75777847
UPDATE profiles 
SET 
  company_name = 'Empresa de prueba SL',
  tax_id = 'B75777847',
  full_name = 'Manuel Test User',
  address = 'Calle Test 123, 28001 Madrid',
  phone = '+34 600 000 000',
  verifactu_nif_activated = true,
  is_basque_country = false,
  basque_province = null,
  updated_at = NOW()
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'manucrk@gmail.com'
);

-- Verify the update was successful
DO $$
DECLARE
  user_count INTEGER;
  profile_updated BOOLEAN := FALSE;
BEGIN
  -- Check if user exists
  SELECT COUNT(*) INTO user_count 
  FROM auth.users 
  WHERE email = 'manucrk@gmail.com';
  
  IF user_count = 0 THEN
    RAISE NOTICE 'WARNING: User manucrk@gmail.com not found in auth.users table';
  ELSE
    -- Check if profile was updated
    SELECT EXISTS(
      SELECT 1 
      FROM profiles p
      JOIN auth.users u ON p.id = u.id
      WHERE u.email = 'manucrk@gmail.com' 
      AND p.tax_id = 'B75777847'
    ) INTO profile_updated;
    
    IF profile_updated THEN
      RAISE NOTICE 'SUCCESS: Profile updated for manucrk@gmail.com with VeriFactu test data';
      RAISE NOTICE 'Company: Empresa de prueba SL';
      RAISE NOTICE 'NIF: B75777847';
      RAISE NOTICE 'VeriFactu Status: Activated';
    ELSE
      RAISE NOTICE 'ERROR: Profile update failed or user has no profile record';
    END IF;
  END IF;
END $$;

-- Display final profile state for verification
SELECT 
  u.email,
  p.company_name,
  p.tax_id,
  p.full_name,
  p.address,
  p.phone,
  p.verifactu_nif_activated,
  p.is_basque_country,
  p.updated_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'manucrk@gmail.com';

-- Add a comment explaining the test data
COMMENT ON TABLE profiles IS 'User profiles table. Test user manucrk@gmail.com configured with official VeriFactu test company data (NIF: B75777847, Company: Empresa de prueba SL) for testing invoice submissions.';