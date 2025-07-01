-- Check the latest invoice and VeriFactu submission error
SELECT 
  i.id,
  i.invoice_number,
  i.client_name,
  i.client_tax_id,
  i.total,
  i.status,
  i.created_at,
  i.verifactu_id,
  i.verifactu_status,
  i.last_submission_error,
  i.submission_retry_count
FROM invoices i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com'
ORDER BY i.created_at DESC
LIMIT 1;