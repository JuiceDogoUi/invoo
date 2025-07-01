-- Check user profile and VeriFactu configuration
SELECT 
  u.email,
  p.company_name,
  p.tax_id,
  p.verifactu_api_key,
  p.verifactu_nif_activated,
  p.full_name,
  p.address
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'manucrk@gmail.com';