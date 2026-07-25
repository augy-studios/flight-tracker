// Serves the public (RLS-protected) Supabase config to the client at
// runtime, so the anon key never has to be hardcoded into a static bundle
// and can instead live in Vercel's environment variables. The anon key is
// safe to expose - it is meaningless without matching Row Level Security
// policies (see /supabase/schema.sql).

export default function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
  });
}
