DROP POLICY IF EXISTS "public read categories" ON public.categories;
DROP POLICY IF EXISTS "public read products" ON public.products;

CREATE POLICY "anon read active categories"
ON public.categories
FOR SELECT
TO anon
USING (active);

CREATE POLICY "signed in read categories"
ON public.categories
FOR SELECT
TO authenticated
USING (active OR public.is_admin());

CREATE POLICY "anon read active products"
ON public.products
FOR SELECT
TO anon
USING (active);

CREATE POLICY "signed in read products"
ON public.products
FOR SELECT
TO authenticated
USING (active OR public.is_admin());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;