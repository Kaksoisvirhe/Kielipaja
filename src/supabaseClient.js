import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase-asetukset puuttuvat. Tarkista .env-tiedosto (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Huoneen nimi tulee osoitteen ?huone=... -parametrista, esim.
// kielipaja.vercel.app/?huone=budjetti-2026
// Jos parametria ei anneta, käytetään oletushuonetta "tyopaja-default".
// Jokainen eri huoneen nimi on oma erillinen kysymys + keskustelu.
const params = new URLSearchParams(window.location.search);
export const ROOM = params.get("huone") || "tyopaja-default";
