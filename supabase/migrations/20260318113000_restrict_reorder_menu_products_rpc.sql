REVOKE ALL ON FUNCTION public.reorder_menu_products(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_menu_products(UUID, UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.reorder_menu_products(UUID, UUID[]) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.reorder_menu_products(UUID, UUID[]) TO service_role;
