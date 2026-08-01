import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const allowedOrigins = new Set([
  "https://wind-racer.vercel.app",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);
const requests = new Map<string, number[]>();
const accountDomain = "players.wind-racer.invalid";

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://wind-racer.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
const normalizeNickname = (value: unknown) => String(value || "").normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().slice(0, 16);
const cleanDisplayName = (value: unknown) => String(value || "MARUJO").normalize("NFKC")
  .replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16) || "MARUJO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  const origin = req.headers.get("origin") || "";
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origem não autorizada." }, 403);
  if (req.method !== "POST") return json(req, { error: "Método não permitido." }, 405);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "Sessão obrigatória." }, 401);
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: auth, error: authError } = await service.auth.getUser(token);
  if (authError || !auth.user) return json(req, { error: "Sessão inválida." }, 401);
  if (!auth.user.is_anonymous) return json(req, { error: "Esta sessão já pertence a uma conta." }, 409);

  const now = Date.now();
  const recent = (requests.get(auth.user.id) || []).filter((time) => now - time < 60000);
  if (recent.length >= 8) return json(req, { error: "Muitas tentativas. Aguarde um minuto." }, 429);
  recent.push(now); requests.set(auth.user.id, recent);

  try {
    const body = await req.json();
    if (body?.action !== "register") return json(req, { error: "Ação inválida." }, 400);
    const nickname = normalizeNickname(body.nickname);
    const password = String(body.password || "");
    const displayName = cleanDisplayName(body.displayName || nickname);
    if (!/^[a-z0-9_]{3,16}$/.test(nickname)) return json(req, { error: "Nickname inválido. Use 3 a 16 letras, números ou _." }, 400);
    if (password.length < 8 || password.length > 72) return json(req, { error: "A senha deve ter de 8 a 72 caracteres." }, 400);

    const { data: existing, error: lookupError } = await service.from("player_profiles")
      .select("user_id").eq("account_name", nickname).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing && existing.user_id !== auth.user.id) return json(req, { error: "Este nickname já está em uso." }, 409);

    const { error: reserveError } = await service.from("player_profiles").upsert({
      user_id: auth.user.id, account_name: nickname, nickname: displayName, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (reserveError) {
      if (reserveError.code === "23505") return json(req, { error: "Este nickname já está em uso." }, 409);
      throw reserveError;
    }

    const email = `${nickname}@${accountDomain}`;
    const { error: updateError } = await service.auth.admin.updateUserById(auth.user.id, {
      email, password, email_confirm: true, user_metadata: { display_name: displayName },
    });
    if (updateError) {
      await service.from("player_profiles").update({ account_name: null }).eq("user_id", auth.user.id);
      if (/already|registered|exists/i.test(updateError.message)) return json(req, { error: "Este nickname já está em uso." }, 409);
      throw updateError;
    }
    return json(req, { ok: true, nickname });
  } catch (error) {
    console.error("player-account", error instanceof Error ? error.message : "unknown");
    return json(req, { error: "Não foi possível criar a conta agora." }, 500);
  }
});
