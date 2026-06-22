-- Restrict coupons SELECT to admin only; validation happens server-side via privileged client
DROP POLICY IF EXISTS "Authenticated can read active coupons" ON public.coupons;
CREATE POLICY "Admins read coupons" ON public.coupons FOR SELECT TO authenticated USING (is_admin());

-- Lock down coupon_redemptions writes to admin only; legitimate inserts go through service role
CREATE POLICY "Admins insert redemptions" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admins update redemptions" ON public.coupon_redemptions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admins delete redemptions" ON public.coupon_redemptions FOR DELETE TO authenticated USING (is_admin());