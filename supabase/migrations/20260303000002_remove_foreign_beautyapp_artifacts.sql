-- ============================================================================
-- Migration: Remove foreign BeautyApp artifacts from MESO Supabase project
-- Context:
--   Remote history accidentally included versions 20260302000001..20260302000014
--   from another project. This migration removes their database/storage objects.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1) Remove foreign auth trigger
-- --------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- --------------------------------------------------------------------------
-- 2) Remove foreign storage policies on storage.objects
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;

DROP POLICY IF EXISTS "Doctors can upload photos for connected patients" ON storage.objects;
DROP POLICY IF EXISTS "Patients can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can view connected patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view own photos" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete connected patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Patients can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all photos" ON storage.objects;

DROP POLICY IF EXISTS "Doctors can upload documents for connected patients" ON storage.objects;
DROP POLICY IF EXISTS "Patients can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can view connected patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all documents" ON storage.objects;

-- --------------------------------------------------------------------------
-- 3) Remove foreign public tables (drops related policies/triggers via CASCADE)
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.medical_documents CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.visit_params CASCADE;
DROP TABLE IF EXISTS public.visits CASCADE;
DROP TABLE IF EXISTS public.template_params CASCADE;
DROP TABLE IF EXISTS public.param_templates CASCADE;
DROP TABLE IF EXISTS public.treatment_templates CASCADE;
DROP TABLE IF EXISTS public.health_records CASCADE;
DROP TABLE IF EXISTS public.doctor_patients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- --------------------------------------------------------------------------
-- 4) Remove foreign helper functions (after dropping dependent objects)
-- --------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lookup_invitation_by_token(text);
DROP FUNCTION IF EXISTS public.accept_invitation(text);
DROP FUNCTION IF EXISTS public.accept_invitation(text, uuid);
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at();

-- --------------------------------------------------------------------------
-- 5) Remove foreign enum types
-- --------------------------------------------------------------------------
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.user_language CASCADE;
DROP TYPE IF EXISTS public.relationship_status CASCADE;
DROP TYPE IF EXISTS public.sharing_scope CASCADE;
DROP TYPE IF EXISTS public.visit_category CASCADE;
DROP TYPE IF EXISTS public.visit_added_by CASCADE;
DROP TYPE IF EXISTS public.visit_rating CASCADE;
DROP TYPE IF EXISTS public.photo_angle CASCADE;
DROP TYPE IF EXISTS public.photo_moment CASCADE;
DROP TYPE IF EXISTS public.param_type CASCADE;
DROP TYPE IF EXISTS public.document_type CASCADE;
DROP TYPE IF EXISTS public.audit_action CASCADE;
DROP TYPE IF EXISTS public.invitation_status CASCADE;

-- --------------------------------------------------------------------------
-- 6) Storage bucket cleanup (manual)
-- --------------------------------------------------------------------------
-- Supabase blocks direct DELETE on storage schema tables in SQL migrations.
-- If you want to remove these foreign buckets entirely, delete them via
-- Storage API / Supabase Dashboard:
--   - avatars
--   - photos
--   - documents
