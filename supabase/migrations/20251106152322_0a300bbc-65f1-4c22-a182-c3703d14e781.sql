-- Create a function to delete matched items when a claim is approved
-- This function runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.delete_matched_items(
  p_claimed_item_id UUID,
  p_matched_item_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the claimed item
  DELETE FROM public.items WHERE id = p_claimed_item_id;
  
  -- Delete all matched items
  IF array_length(p_matched_item_ids, 1) > 0 THEN
    DELETE FROM public.items WHERE id = ANY(p_matched_item_ids);
  END IF;
END;
$$;