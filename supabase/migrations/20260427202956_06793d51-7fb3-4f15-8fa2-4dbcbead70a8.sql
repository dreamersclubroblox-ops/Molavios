-- Streaks
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE,
  total_claimed BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read streak" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert streak" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update streak" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage streaks" ON public.user_streaks FOR ALL USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Chats
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nieuwe chat',
  model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  web_search BOOLEAN NOT NULL DEFAULT false,
  canvas BOOLEAN NOT NULL DEFAULT false,
  deep_research BOOLEAN NOT NULL DEFAULT false,
  learn_mode BOOLEAN NOT NULL DEFAULT false,
  extra_files BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chats_user_idx ON public.chats(user_id, updated_at DESC);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read chats" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update chats" ON public.chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete chats" ON public.chats FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_chat_idx ON public.chat_messages(chat_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read chat msgs" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert chat msgs" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete chat msgs" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- User memories ("leer"-modus)
CREATE TABLE public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fact TEXT NOT NULL,
  source_chat_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_memories_user_idx ON public.user_memories(user_id, created_at DESC);
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read memories" ON public.user_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert memories" ON public.user_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update memories" ON public.user_memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete memories" ON public.user_memories FOR DELETE USING (auth.uid() = user_id);

-- Saved tools (tool-getter)
CREATE TABLE public.saved_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tool_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_slug)
);
ALTER TABLE public.saved_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read saved tools" ON public.saved_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert saved tools" ON public.saved_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner delete saved tools" ON public.saved_tools FOR DELETE USING (auth.uid() = user_id);

-- AI generated mini tools (eigen pagina per tool)
CREATE TABLE public.generated_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Wrench',
  html TEXT NOT NULL,
  prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX generated_tools_user_idx ON public.generated_tools(user_id, created_at DESC);
ALTER TABLE public.generated_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read gen tools" ON public.generated_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owner insert gen tools" ON public.generated_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update gen tools" ON public.generated_tools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete gen tools" ON public.generated_tools FOR DELETE USING (auth.uid() = user_id);

-- Triggers updated_at
CREATE TRIGGER chats_updated_at BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER generated_tools_updated_at BEFORE UPDATE ON public.generated_tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Streak claim function: gives 500 * 1.1^(streak-1) tokens, max 1 per day
CREATE OR REPLACE FUNCTION public.claim_daily_streak(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  today DATE := (now() AT TIME ZONE 'UTC')::date;
  new_streak INTEGER;
  reward INTEGER;
BEGIN
  IF _user_id IS NULL OR _user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO s FROM public.user_streaks WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_claim_date, total_claimed)
    VALUES (_user_id, 0, 0, NULL, 0);
    SELECT * INTO s FROM public.user_streaks WHERE user_id = _user_id FOR UPDATE;
  END IF;

  IF s.last_claim_date = today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed', 'next_claim', (today + 1));
  END IF;

  IF s.last_claim_date = today - INTERVAL '1 day' THEN
    new_streak := s.current_streak + 1;
  ELSE
    new_streak := 1;
  END IF;

  reward := floor(500 * power(1.1, new_streak - 1))::int;
  IF reward > 50000 THEN reward := 50000; END IF;

  -- Add to balance
  INSERT INTO public.user_tokens (user_id, balance) VALUES (_user_id, 50000 + reward)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_tokens.balance + reward, updated_at = now();

  UPDATE public.user_streaks
    SET current_streak = new_streak,
        longest_streak = GREATEST(longest_streak, new_streak),
        last_claim_date = today,
        total_claimed = total_claimed + reward,
        updated_at = now()
    WHERE user_id = _user_id;

  RETURN jsonb_build_object('ok', true, 'reward', reward, 'streak', new_streak, 'next_claim', (today + 1));
END;
$$;