DROP POLICY IF EXISTS "admin orders update" ON public.orders;
CREATE POLICY "admins can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin insert history" ON public.order_status_history;
CREATE POLICY "admins can insert history" ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());