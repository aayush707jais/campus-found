-- Update foreign key for items table to reference profiles instead of auth.users
ALTER TABLE public.items DROP CONSTRAINT IF EXISTS items_user_id_fkey;
ALTER TABLE public.items ADD CONSTRAINT items_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update foreign key for claims table to reference profiles
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_claimant_id_fkey;
ALTER TABLE public.claims ADD CONSTRAINT claims_claimant_id_fkey 
  FOREIGN KEY (claimant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;