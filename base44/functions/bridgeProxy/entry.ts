// ─────────────────────────────────────────────────────────────────────────────
// InLive — bridgeProxy v2
// Proxy server-side para a saganBridge do Watcher.
// Os segredos ficam em variáveis de ambiente do Base44 — nunca no código.
// O AoVivo.jsx chama /api/functions/bridgeProxy sem nenhuma credencial.
//
// Variáveis de ambiente necessárias (configurar no painel Base44):
//   INLIVE_READ_SECRET    → segredo read-only para o InLive (distinto do segredo full do Sagan)
//   SAGAN_API_KEY         → api_key do app Watcher
//
// Apenas acções de leitura são permitidas (list, filter, get).
// Qualquer tentativa de create/update/delete é bloqueada aqui.
// ─────────────────────────────────────────────────────────────────────────────

const BRIDGE_URL = "https://watcherweb.base44.app/api/functions/saganBridge";

// Segredos lidos de env vars — nunca expostos no bundle público nem no código
const SAGAN_SECRET  = Deno.env.get("INLIVE_READ_SECRET") ?? "";
const SAGAN_API_KEY = Deno.env.get("SAGAN_API_KEY") ?? "";

// Acções permitidas ao InLive (read-only)
const READ_ACTIONS = new Set(["list", "filter", "get"]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validar que as env vars estão configuradas
  if (!SAGAN_SECRET || !SAGAN_API_KEY) {
    console.error("bridgeProxy: env vars INLIVE_READ_SECRET ou SAGAN_API_KEY não configuradas");
    return new Response(
      JSON.stringify({ error: "Proxy not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const action: string = (body?.action || "").toLowerCase();

  // ── Guardrail: bloquear qualquer acção que não seja leitura ──────────────
  if (!READ_ACTIONS.has(action)) {
    console.warn(`bridgeProxy: acção bloqueada '${action}'`);
    return new Response(
      JSON.stringify({ error: `Action '${action}' not permitted. Read-only.` }),
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
    console.error("bridgeProxy: upstream error", err?.message);
    return new Response(
      JSON.stringify({ error: "Bridge unreachable", detail: err?.message }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
