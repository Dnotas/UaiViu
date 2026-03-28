-- Execute no painel Supabase: SQL Editor
-- https://supabase.com/dashboard/project/reubrhhceuxwbtaqxcnq/sql

CREATE TABLE IF NOT EXISTS public.assinaturas (
  id               BIGSERIAL PRIMARY KEY,
  nome             TEXT NOT NULL,
  email            TEXT NOT NULL,
  telefone         TEXT NOT NULL,
  plano            TEXT NOT NULL,
  valor            DECIMAL(10,2),
  asaas_customer_id TEXT,
  asaas_payment_id  TEXT UNIQUE,
  status           TEXT DEFAULT 'pendente',  -- pendente | confirmado | vencido | cancelado
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

-- RLS: apenas o service_role (Edge Functions) pode acessar
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

-- Sem policies públicas = acesso bloqueado para anon/authenticated
-- Edge Functions usam service_role e bypassam RLS automaticamente
