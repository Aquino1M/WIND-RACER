import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const allowedOrigins = new Set([
  "https://wind-racer.vercel.app",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);
const requests = new Map<string, number[]>();

function headers(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://wind-racer.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: headers(req) });
const cleanCode = (value: unknown) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
const cleanName = (value: unknown) => String(value || "MARUJO").normalize("NFKC")
  .replace(/[^\p{L}\p{N} _-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16) || "MARUJO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: headers(req) });
  const origin = req.headers.get("origin") || "";
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origem não autorizada" }, 403);

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(req, { error: "Autenticação obrigatória" }, 401);
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: auth, error: authError } = await service.auth.getUser(token);
  if (authError || !auth.user) return json(req, { error: "Sessão inválida" }, 401);

  const now = Date.now();
  const recent = (requests.get(auth.user.id) || []).filter((time) => now - time < 60000);
  if (recent.length >= 60) return json(req, { error: "Muitas requisições. Aguarde um minuto." }, 429);
  recent.push(now);
  requests.set(auth.user.id, recent);

  try {
    const cutoff = new Date(now - 180000).toISOString();
    await service.from("game_rooms").delete().lt("last_seen", cutoff);

    if (req.method === "GET") {
      const { data: rooms, error } = await service.from("game_rooms")
        .select("code,host_name,max_players,created_at,last_seen,room_members(count)")
        .eq("is_public", true).gte("last_seen", cutoff)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return json(req, { rooms: (rooms || []).map((room) => ({
        code: room.code,
        host_name: room.host_name,
        player_count: room.room_members?.[0]?.count || 1,
        max_players: room.max_players,
        created_at: room.created_at,
        last_seen: room.last_seen,
      })) });
    }
    if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const code = cleanCode(body.code);
    if (!/^[A-Z0-9]{5}$/.test(code)) return json(req, { error: "Código inválido" }, 400);

    if (action === "register") {
      const hostName = cleanName(body.hostName);
      const { error } = await service.from("game_rooms").insert({
        code, host_user_id: auth.user.id, host_name: hostName,
        is_public: body.isPublic !== false, max_players: 8, last_seen: new Date().toISOString(),
      });
      if (error?.code === "23505") return json(req, { error: "Código em uso. Tente novamente." }, 409);
      if (error) throw error;
      const { error: memberError } = await service.from("room_members").insert({
        room_code: code, user_id: auth.user.id, nickname: hostName, is_host: true,
      });
      if (memberError) {
        await service.from("game_rooms").delete().eq("code", code).eq("host_user_id", auth.user.id);
        throw memberError;
      }
      return json(req, { ok: true });
    }

    if (action === "join") {
      const { data: room } = await service.from("game_rooms")
        .select("code,max_players,last_seen").eq("code", code).gte("last_seen", cutoff).maybeSingle();
      if (!room) return json(req, { error: "Sala não encontrada ou expirada." }, 404);
      const { count } = await service.from("room_members").select("user_id", { count: "exact", head: true }).eq("room_code", code);
      if ((count || 0) >= room.max_players) return json(req, { error: "A sala está cheia." }, 409);
      const nickname = cleanName(body.nickname);
      const { error } = await service.from("room_members").upsert({
        room_code: code, user_id: auth.user.id, nickname, is_host: false, last_seen: new Date().toISOString(),
      }, { onConflict: "room_code,user_id" });
      if (error) throw error;
      return json(req, { ok: true });
    }

    if (action === "heartbeat") {
      const { data: room } = await service.from("game_rooms")
        .select("host_user_id").eq("code", code).maybeSingle();
      if (!room || room.host_user_id !== auth.user.id) return json(req, { error: "Sala não autorizada" }, 403);
      const timestamp = new Date().toISOString();
      await service.from("game_rooms").update({ last_seen: timestamp }).eq("code", code).eq("host_user_id", auth.user.id);
      await service.from("room_members").update({ last_seen: timestamp }).eq("room_code", code).eq("user_id", auth.user.id);
      return json(req, { ok: true });
    }

    if (action === "leave") {
      const { data: room } = await service.from("game_rooms").select("host_user_id").eq("code", code).maybeSingle();
      if (room?.host_user_id === auth.user.id) {
        await service.from("game_rooms").delete().eq("code", code).eq("host_user_id", auth.user.id);
      } else {
        await service.from("room_members").delete().eq("room_code", code).eq("user_id", auth.user.id);
      }
      return json(req, { ok: true });
    }

    return json(req, { error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("public-rooms", error);
    return json(req, { error: "Falha temporária no lobby." }, 500);
  }
});
