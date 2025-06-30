# Database Sync Required

## ⚠️ Database Schema Updates Needed

The database needs to be updated with the latest VeriFactu integration changes. You need to apply these migrations in order:

### ✅ Already Applied
1. `001_initial_setup.sql` - Basic tables and authentication

### ✅ Applied Successfully

#### 2. VeriFactu Fields Migration
```sql
-- APPLIED: 002_verifactu_fields_fixed.sql (with policy conflict resolution)
```
**Added:**
- VeriFactu-specific fields to invoices table
- VeriFactu submission audit trail table
- Tax type mapping for line items
- Automatic invoice numbering functions

#### 3. Updated Invoice Type Limits
```sql
-- APPLIED: 003_update_invoice_type_limits.sql
```
**Updated:**
- F2 invoice limit from 400€ to 3,000€ (per VeriFactu docs)
- Added TicketBAI support fields to user profiles
- Improved invoice type determination logic
- Added performance indexes

## 🔧 How to Apply

### Option 1: Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard/project/zquygsteryolqyxfpqcz/sql
2. Copy and paste `002_verifactu_fields.sql` content
3. Execute the SQL
4. Copy and paste `003_update_invoice_type_limits.sql` content  
5. Execute the SQL

### Option 2: SQL Files
1. Read the content of each migration file
2. Apply them in order in Supabase SQL Editor

## 📊 New Database Schema

### Updated Tables

#### `invoices` table additions:
- `verifactu_id` - VeriFactu response ID
- `verifactu_status` - Submission status
- `invoice_type` - F1, F2, R1-R5, F3
- `serie` - Invoice series (A, B, etc.)
- `numero` - Invoice number

#### `invoice_line_items` additions:
- `tax_type` - S1, S2, S3, E, NS (VeriFactu tax codes)

#### `profiles` table additions:
- `is_basque_country` - TicketBAI requirement
- `basque_province` - alava, guipuzcoa, vizcaya
- `verifactu_api_key` - User's API key
- `verifactu_nif_activated` - NIF activation status

#### New `verifactu_submissions` table:
- Audit trail for all VeriFactu API calls
- Request/response data storage
- Status tracking

## 🎯 After Migration

### What Changes
1. **Invoice Types**: Automatic F1/F2 detection based on 3,000€ limit
2. **Tax Validation**: Spanish IVA rates enforced
3. **TicketBAI Ready**: Basque Country support enabled
4. **Audit Trail**: All VeriFactu submissions logged
5. **Performance**: Optimized indexes for VeriFactu lookups

### Next Steps
1. Apply the migrations
2. Test invoice creation with new validation
3. Configure user profiles for VeriFactu API keys
4. Test TicketBAI functionality (if Basque Country users)

## ⚠️ Important Notes

- **Backup First**: Always backup before applying migrations
- **Test Environment**: Apply to test database first
- **Data Migration**: Existing invoices will be automatically updated
- **No Data Loss**: All existing data preserved

## 🔍 Verification

After applying migrations, verify:
```sql
-- Check new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name IN 
('verifactu_id', 'verifactu_status', 'invoice_type', 'serie', 'numero');

-- Check new table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'verifactu_submissions';

-- Check updated function
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'set_invoice_type';
```

Ready to sync! 🚀