import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase-asetukset puuttuvat. Tarkista .env-tiedosto (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Nimi huoneelle - jos haluat useamman erillisen työpajan samalla Supabase-projektilla,
// vaihda tämä esim. "tyopaja-2026-03" ja anna eri linkki eri ryhmille.
export const ROOM = "tyopaja-default";
