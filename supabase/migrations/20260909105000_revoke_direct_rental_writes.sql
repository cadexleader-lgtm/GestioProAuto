ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members insert" ON public.rentals;
DROP POLICY IF EXISTS "members update" ON public.rentals;
DROP POLICY IF EXISTS "managers delete" ON public.rentals;

DROP POLICY IF EXISTS "members insert rental payments" ON public.rental_payments;
DROP POLICY IF EXISTS "members update rental payments" ON public.rental_payments;
DROP POLICY IF EXISTS "managers delete rental payments" ON public.rental_payments;

REVOKE INSERT, UPDATE, DELETE ON public.rentals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rental_payments FROM authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.rentals FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.rental_payments FROM PUBLIC;

GRANT SELECT ON public.rentals TO authenticated;
GRANT SELECT ON public.rental_payments TO authenticated;

GRANT ALL ON public.rentals TO service_role;
GRANT ALL ON public.rental_payments TO service_role;

NOTIFY pgrst, 'reload schema';
