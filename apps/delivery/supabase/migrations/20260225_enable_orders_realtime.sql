-- Enable Realtime for orders table so clients can subscribe to status changes
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Full replica identity needed for Realtime to send complete row data on UPDATE
ALTER TABLE orders REPLICA IDENTITY FULL;
