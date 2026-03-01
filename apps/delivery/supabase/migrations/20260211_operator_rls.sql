-- Migration: Operator RLS Policies
-- Description: Allow anon role (operator panel) to view/update all orders
-- The operator panel authenticates via PIN (Zustand), not Supabase Auth,
-- so it uses the anon key and needs these policies.

-- Operator panel needs to view/update all orders (uses anon key)
CREATE POLICY "Anon can view all orders" ON orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update orders" ON orders
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Anon can view all order items" ON order_items
  FOR SELECT TO anon USING (true);

-- Operator needs customer name/phone for order cards
CREATE POLICY "Anon can view customer info" ON customers
  FOR SELECT TO anon USING (true);
