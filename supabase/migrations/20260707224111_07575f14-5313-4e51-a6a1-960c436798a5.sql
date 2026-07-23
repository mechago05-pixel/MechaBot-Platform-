
REVOKE EXECUTE ON FUNCTION public.notify_on_request_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_own_mechanic_profile() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_resets() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_mechanic_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_mechanic_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_service_request(uuid, uuid) TO authenticated;
