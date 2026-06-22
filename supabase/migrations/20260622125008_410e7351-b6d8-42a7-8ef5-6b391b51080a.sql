
-- Re-grant + switch helpers to SECURITY INVOKER (authenticated already has SELECT on user_roles).
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
