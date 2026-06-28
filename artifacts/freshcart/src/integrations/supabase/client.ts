import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare global {
  interface Window {
    __ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_PUBLISHABLE_KEY?: string;
    };
  }
}

function createSupabaseClient() {
  // Priority order:
  // 1. Runtime config injected by the Express server (window.__ENV) — works in all deployments
  // 2. Vite build-time env vars (VITE_ prefix) — used in local dev via Replit
  const SUPABASE_URL =
    (typeof window !== 'undefined' ? window.__ENV?.SUPABASE_URL : undefined) ||
    import.meta.env.VITE_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    (typeof window !== 'undefined' ? window.__ENV?.SUPABASE_PUBLISHABLE_KEY : undefined) ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase config: ${missing.join(', ')}. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY on your server.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
