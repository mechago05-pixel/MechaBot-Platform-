
-- Service prices table (bilingual)
CREATE TABLE IF NOT EXISTS public.service_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name_en TEXT NOT NULL,
  service_name_sw TEXT NOT NULL,
  car_size TEXT NOT NULL DEFAULT 'medium',
  estimated_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view prices
CREATE POLICY "Anyone can view service prices"
  ON public.service_prices FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage prices
CREATE POLICY "Admins can insert service prices"
  ON public.service_prices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service prices"
  ON public.service_prices FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service prices"
  ON public.service_prices FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for messages and notifications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Seed service prices
INSERT INTO public.service_prices (service_name_en, service_name_sw, car_size, estimated_price) VALUES
  ('Engine Repair', 'Ukarabati wa Injini', 'small', 24000),
  ('Engine Repair', 'Ukarabati wa Injini', 'medium', 30000),
  ('Engine Repair', 'Ukarabati wa Injini', 'large', 39000),
  ('Battery Replacement', 'Kubadilisha Betri', 'small', 16000),
  ('Battery Replacement', 'Kubadilisha Betri', 'medium', 20000),
  ('Battery Replacement', 'Kubadilisha Betri', 'large', 26000),
  ('Flat Tire Fix', 'Kurekebisha Tairi', 'small', 12000),
  ('Flat Tire Fix', 'Kurekebisha Tairi', 'medium', 15000),
  ('Flat Tire Fix', 'Kurekebisha Tairi', 'large', 19500),
  ('Brake Repair', 'Ukarabati wa Breki', 'small', 22400),
  ('Brake Repair', 'Ukarabati wa Breki', 'medium', 28000),
  ('Brake Repair', 'Ukarabati wa Breki', 'large', 36400),
  ('Oil Change', 'Kubadilisha Mafuta', 'small', 12000),
  ('Oil Change', 'Kubadilisha Mafuta', 'medium', 15000),
  ('Oil Change', 'Kubadilisha Mafuta', 'large', 19500),
  ('Overheating Fix', 'Kurekebisha Joto', 'small', 28000),
  ('Overheating Fix', 'Kurekebisha Joto', 'medium', 35000),
  ('Overheating Fix', 'Kurekebisha Joto', 'large', 45500),
  ('AC Service', 'Huduma ya AC', 'small', 20000),
  ('AC Service', 'Huduma ya AC', 'medium', 25000),
  ('AC Service', 'Huduma ya AC', 'large', 32500);
