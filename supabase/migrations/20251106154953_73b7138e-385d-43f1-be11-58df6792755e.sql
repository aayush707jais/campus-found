-- Update the delete_matched_items function to include security checks
-- This prevents unauthorized users from deleting items
CREATE OR REPLACE FUNCTION public.delete_matched_items(
  p_claimed_item_id UUID,
  p_matched_item_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_owner_id UUID;
  v_claimant_id UUID;
  v_claim_id UUID;
  v_invalid_items INT;
BEGIN
  -- 1. Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Verify the claimed item exists and belongs to the caller
  SELECT user_id INTO v_item_owner_id
  FROM public.items
  WHERE id = p_claimed_item_id;
  
  IF v_item_owner_id IS NULL THEN
    RAISE EXCEPTION 'Claimed item not found';
  END IF;
  
  IF v_item_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not own this item';
  END IF;

  -- 3. Verify there's an approved claim for this item
  SELECT id, claimant_id INTO v_claim_id, v_claimant_id
  FROM public.claims
  WHERE item_id = p_claimed_item_id
    AND status = 'approved'
  LIMIT 1;
  
  IF v_claim_id IS NULL THEN
    RAISE EXCEPTION 'No approved claim found for this item';
  END IF;

  -- 4. Verify all matched items belong to the claimant
  IF array_length(p_matched_item_ids, 1) > 0 THEN
    SELECT COUNT(*) INTO v_invalid_items
    FROM public.items
    WHERE id = ANY(p_matched_item_ids)
      AND user_id != v_claimant_id;
    
    IF v_invalid_items > 0 THEN
      RAISE EXCEPTION 'Some matched items do not belong to the claimant';
    END IF;
  END IF;

  -- 5. All checks passed, proceed with deletion
  DELETE FROM public.items WHERE id = p_claimed_item_id;
  
  IF array_length(p_matched_item_ids, 1) > 0 THEN
    DELETE FROM public.items WHERE id = ANY(p_matched_item_ids);
  END IF;
END;
$$;