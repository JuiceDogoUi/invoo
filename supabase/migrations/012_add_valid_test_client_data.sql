-- Migration: Add valid test client data information
-- File: 012_add_valid_test_client_data.sql  
-- Purpose: Document valid test client data for VeriFactu/Verifacti testing
-- Date: 2025-07-01

-- Add a comment with valid test client data for developers
COMMENT ON TABLE invoices IS 'Invoices table. For VeriFactu testing, use these valid test client NIFs:
- A15022510 (Empresa de prueba SL) - Valid test company
- B75777847 (Your company) - Can be used as client too
- For invoices under 3000€: Leave client NIF empty for F2 type invoices';

-- Show current test environment setup
SELECT 
  'VeriFactu Test Environment Setup' as info,
  'Valid test client NIFs for invoice creation:' as note;

SELECT 
  'A15022510' as valid_test_client_nif,
  'Empresa de prueba SL' as company_name,
  'Use this for F1 invoices with client identification' as usage;

SELECT 
  'B75777847' as your_company_nif,
  'Empresa de prueba SL' as your_company_name,
  'Can also be used as client NIF for testing' as usage;

SELECT 
  'Empty/NULL' as client_nif_for_f2,
  'Any client name' as client_name,
  'For invoices under 3000€ - generates F2 invoice type' as usage;