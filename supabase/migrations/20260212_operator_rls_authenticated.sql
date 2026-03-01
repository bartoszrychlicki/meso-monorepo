-- Migration: Operator RLS Policies for authenticated role
-- The browser client may have an anonymous auth session cookie,
-- making the role 'authenticated' instead of 'anon'.
-- The operator panel needs full access to orders regardless of auth state.

-- Allow any authenticated user to view all orders (operator panel)
CREATE POLICY "Authenticated can view all orders" ON orders
  FOR SELECT TO authenticated USING (true);

-- Allow any authenticated user to update orders (operator status changes)
CREATE POLICY "Authenticated can update all orders" ON orders
  FOR UPDATE TO authenticated USING (true);

-- Allow viewing all order items
CREATE POLICY "Authenticated can view all order items" ON order_items
  FOR SELECT TO authenticated USING (true);

-- Allow viewing customer info for order cards
CREATE POLICY "Authenticated can view all customer info" ON customers
  FOR SELECT TO authenticated USING (true);
