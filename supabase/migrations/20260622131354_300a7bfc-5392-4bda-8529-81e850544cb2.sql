
-- Promote admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'isalonikashyap@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Delivery areas (pincode allowlist)
CREATE TABLE public.delivery_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode TEXT NOT NULL UNIQUE,
  area_name TEXT NOT NULL,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  eta_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_areas TO anon, authenticated;
GRANT ALL ON public.delivery_areas TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_areas TO authenticated;
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active areas" ON public.delivery_areas FOR SELECT USING (true);
CREATE POLICY "Admins manage areas insert" ON public.delivery_areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage areas update" ON public.delivery_areas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage areas delete" ON public.delivery_areas FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER delivery_areas_updated_at BEFORE UPDATE ON public.delivery_areas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Coupons
CREATE TYPE public.coupon_type AS ENUM ('percent', 'flat');
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type coupon_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10,2),
  usage_limit INTEGER,
  per_user_limit INTEGER NOT NULL DEFAULT 1,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active OR public.is_admin());
CREATE POLICY "Admins insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.is_admin());
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Redemptions
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

-- Order columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Seed a couple of pincodes + coupons
INSERT INTO public.delivery_areas (pincode, area_name, delivery_fee, eta_minutes) VALUES
  ('110001', 'Connaught Place', 25, 12),
  ('400001', 'Fort, Mumbai', 30, 15),
  ('560001', 'MG Road, Bengaluru', 25, 14),
  ('700001', 'BBD Bagh, Kolkata', 30, 18)
ON CONFLICT (pincode) DO NOTHING;

INSERT INTO public.coupons (code, description, type, value, min_order_amount, max_discount, per_user_limit) VALUES
  ('WELCOME50', 'Flat ₹50 off on your first order', 'flat', 50, 199, NULL, 1),
  ('FRESH10', '10% off up to ₹100', 'percent', 10, 299, 100, 5)
ON CONFLICT (code) DO NOTHING;
