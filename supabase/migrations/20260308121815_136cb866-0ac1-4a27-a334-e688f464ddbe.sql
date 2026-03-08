CREATE POLICY "Users can delete own activity" ON public.activity_log
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);