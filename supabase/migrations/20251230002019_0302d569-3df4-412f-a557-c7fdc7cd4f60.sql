
-- Drop existing policy
DROP POLICY IF EXISTS "Agents can view own region batches" ON cargo_batches;

-- Create new policy that checks all assigned regions
CREATE POLICY "Agents can view own region batches" ON cargo_batches
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  origin_region IN (
    SELECT region_code::agent_region 
    FROM agent_regions 
    WHERE user_id = auth.uid()
  )
);

-- Also fix the update policy
DROP POLICY IF EXISTS "Agents can update open batches in their region" ON cargo_batches;

CREATE POLICY "Agents can update open batches in their region" ON cargo_batches
FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) AND 
  origin_region IN (
    SELECT region_code::agent_region 
    FROM agent_regions 
    WHERE user_id = auth.uid()
  ) AND 
  status = 'open'::text
);

-- Also fix the insert policy
DROP POLICY IF EXISTS "Agents can insert batches for their region" ON cargo_batches;

CREATE POLICY "Agents can insert batches for their region" ON cargo_batches
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND 
  origin_region IN (
    SELECT region_code::agent_region 
    FROM agent_regions 
    WHERE user_id = auth.uid()
  )
);
