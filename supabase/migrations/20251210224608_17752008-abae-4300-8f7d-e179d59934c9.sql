-- Enable realtime for message_history to track broadcast progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_history;