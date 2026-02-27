-- Rollback 000009: Remove delivery app config & promo banners
DROP FUNCTION IF EXISTS public.get_auth_user_id_by_email(text);
DROP TABLE IF EXISTS promo_banners CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;
