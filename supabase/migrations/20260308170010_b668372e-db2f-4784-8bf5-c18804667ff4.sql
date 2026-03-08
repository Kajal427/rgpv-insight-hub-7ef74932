
DROP FUNCTION IF EXISTS public.admin_get_all_profiles_with_email();

CREATE FUNCTION public.admin_get_all_profiles_with_email()
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, department text,
  created_at timestamp with time zone, updated_at timestamp with time zone,
  email text, last_sign_in_at timestamp with time zone, is_blocked boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id, p.user_id, p.full_name, p.phone, p.department, p.created_at, p.updated_at,
    u.email::text,
    u.last_sign_in_at,
    p.is_blocked
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY p.created_at DESC
$$;
