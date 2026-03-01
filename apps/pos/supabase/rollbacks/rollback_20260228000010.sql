-- Rollback 000010: Restore original trigger (gen_random_uuid for crm_customers.id)
-- This rollback restores the original handle_new_delivery_customer function
-- from migration 000002. No structural changes to revert.
-- Note: Any customers created with id=auth_id pattern will remain in the DB.
-- This is safe since both fields are valid UUIDs.

-- The original function is in 20260228000002_delivery_extend_crm.sql
-- To fully rollback, re-apply that version of the function.
