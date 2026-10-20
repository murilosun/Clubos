import { createClient } from "@supabase/supabase-js";

// A URL do projeto e a chave publicável não são segredos — são feitas para
// ficar no código do lado do cliente. Quem protege os dados de verdade é o
// RLS (Row Level Security) configurado no banco, não o sigilo desta chave.
export const SUPABASE_URL = "https://fsmcobjzmgqvgbrovzrm.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_GPc-Avp6vA-rgBiIVcV5gQ_4MDOV1iW";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// ID fixo da sua empresa no banco multiempresa. Quando o sistema virar SaaS
// para várias estéticas automotivas, isso passa a ser resolvido dinamicamente
// a partir do usuário logado, em vez de fixo aqui.
export const COMPANY_ID = "6ffdf608-cad8-4d35-b6a7-ee329e6737cb";
