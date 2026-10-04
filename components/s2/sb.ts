import { createClient } from "@/lib/supabase/client";

let client: ReturnType<typeof createClient> | null = null;

/** Lazy browser client. Only call inside effects/handlers (never during render: build has no env). */
export const sb = () => (client ??= createClient());
