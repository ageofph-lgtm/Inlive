// ─────────────────────────────────────────────────────────────────────────────
// InLive — bridgeProxy
// Proxy server-side para a saganBridge do Watcher.
// Os segredos nunca chegam ao browser — ficam aqui, no servidor.
// O AoVivo.jsx chama /api/functions/bridgeProxy (sem headers de autenticação).
// Esta function injeta as credenciais e reencaminha para a saganBridge.
//
// Apenas acções de leitura são permitidas (list, filter, get).
// Qualquer tentativa de create/update/delete é bloqueada aqui.
// ─────────────────────────────────────────────────────────────────────────────

const BRIDGE_URL     = "https://watcherweb.base44.app/api/functions/saganBridge";
const SAGAN_SECRET   = "sagan-watcher-bridge-2026";
const SAGAN_API_KEY  = "f8517554492e492090b62dd501ad7e14";

// Acções permitidas ao InLive (read-only)
const READ_ACTIONS = new Set(["list", "filter", "get"]);

export default async function handler(req: Request): Promise<Response> {
  // CORS — permitir chamadas do watcherlive.com e localhost (dev)
  const origin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const action: string = (body?.action || "").toLowerCase();

  // ── Guardrail: bloquear qualquer acção que não seja leitura ──────────────
  if (!READ_ACTIONS.has(action)) {
    return new Response(
      JSON.stringify({ error: `Action '${action}' not permitted via InLive proxy. Read-only.` }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Reencaminhar para saganBridge com credenciais server-side ────────────
  try {
    const upstream = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sagan-secret": SAGAN_SECRET,
        "api_key": SAGAN_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Bridge unreachable", detail: err?.message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
