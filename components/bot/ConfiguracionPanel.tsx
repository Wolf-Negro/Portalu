"use client";

import { useEffect, useState } from "react";
import type { AppConfig } from "@/lib/bot-db";

interface MetaCfg {
  pixel_id:        string;
  capi_token:      string;
  test_event_code: string;
  updated_at:      string | null;
}

interface PipelineState {
  nombre_asesor:    string;
  whatsapp_asesor:  string;
  valor_conversion: number | "";
  moneda:           string;
  col1_name:        string;
  col2_name:        string;
  col3_name:        string;
  col4_name:        string;
  bot_delay_s:      number | "";
}

interface CerebroState {
  sistema_prompt:      string;
  reglas_precalificar: string;
  reglas_derivar:      string;
  openai_api_key:      string;
}

const COL_DEFAULTS = ["Registro", "Precalificado", "Atención Comercial", "Pago Diagnóstico"] as const;

const PIPELINE_DEFAULTS: PipelineState = {
  nombre_asesor:    "",
  whatsapp_asesor:  "",
  valor_conversion: 380,
  moneda:           "PEN",
  col1_name:        "",
  col2_name:        "",
  col3_name:        "",
  col4_name:        "",
  bot_delay_s:      3,
};

const CEREBRO_DEFAULTS: CerebroState = {
  sistema_prompt:      "",
  reglas_precalificar: "",
  reglas_derivar:      "",
  openai_api_key:      "",
};

const META_DEFAULTS: MetaCfg = {
  pixel_id:        "",
  capi_token:      "",
  test_event_code: "",
  updated_at:      null,
};

const CLS_INPUT =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-lavender)]/20 focus:border-[var(--color-lavender)] outline-none transition bg-gray-50/30";

export default function ConfiguracionPanel() {

  const [pipeline,  setPipeline]  = useState<PipelineState>(PIPELINE_DEFAULTS);
  const [savingP,   setSavingP]   = useState(false);
  const [msgP,      setMsgP]      = useState("");

  const [cerebro,   setCerebro]   = useState<CerebroState>(CEREBRO_DEFAULTS);

  const [loadError, setLoadError] = useState(false);

  const [meta,      setMeta]      = useState<MetaCfg>(META_DEFAULTS);
  const [savingM,   setSavingM]   = useState(false);
  const [msgM,      setMsgM]      = useState("");

  useEffect(() => {
    fetch("/api/app-config")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: AppConfig) => {
        setPipeline({
          nombre_asesor:    d.nombre_asesor    ?? "",
          whatsapp_asesor:  (d as any).whatsapp_asesor ?? "",
          valor_conversion: d.valor_conversion ?? 380,
          moneda:           d.moneda           ?? "PEN",
          col1_name:        d.col1_name        ?? "",
          col2_name:        d.col2_name        ?? "",
          col3_name:        d.col3_name        ?? "",
          col4_name:        d.col4_name        ?? "",
          bot_delay_s:      Math.round((d.bot_delay_ms ?? 2500) / 1000),
        });
        setCerebro({
          sistema_prompt:      d.sistema_prompt      ?? "",
          reglas_precalificar: d.reglas_precalificar ?? "",
          reglas_derivar:      d.reglas_derivar      ?? "",
          openai_api_key: d.openai_api_key
            ? `${d.openai_api_key.slice(0, 7)}${"•".repeat(10)}`
            : "",
        });
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

    fetch("/api/configuracion-meta")
      .then((r) => r.json())
      .then((d: MetaCfg) => setMeta(d))
      .catch(() => {});
  }, []);

  const handleSavePipeline = async () => {
    setSavingP(true);
    setMsgP("");
    try {
      const valorRaw  = Number(pipeline.valor_conversion);
      const valorSafe = isFinite(valorRaw) && valorRaw > 0 ? valorRaw : 380;

      const res = await fetch("/api/app-config", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_asesor:       pipeline.nombre_asesor       || null,
          whatsapp_asesor:     pipeline.whatsapp_asesor     || null,
          valor_conversion:    valorSafe,
          moneda:              pipeline.moneda              || "PEN",
          bot_delay_ms:        (() => {
            const s = Number(pipeline.bot_delay_s);
            return isFinite(s) && s >= 1 ? Math.round(s * 1000) : 2500;
          })(),
          col1_name:           pipeline.col1_name           || null,
          col2_name:           pipeline.col2_name           || null,
          col3_name:           pipeline.col3_name           || null,
          col4_name:           pipeline.col4_name           || null,
          sistema_prompt:      cerebro.sistema_prompt.trim()      || null,
          reglas_precalificar: cerebro.reglas_precalificar.trim() || null,
          reglas_derivar:      cerebro.reglas_derivar.trim()      || null,
          ...(cerebro.openai_api_key && !cerebro.openai_api_key.includes("•")
            ? { openai_api_key: cerebro.openai_api_key.trim() || null }
            : {}),
        } satisfies Partial<AppConfig>),
      });

      if (res.ok) {
        setPipeline((p) => ({ ...p, valor_conversion: valorSafe }));
        setMsgP("✅ Configuración guardada.");
        window.dispatchEvent(new Event("app-config-updated"));
      } else {
        setMsgP("❌ Error al guardar.");
      }
    } catch {
      setMsgP("❌ Error de red. Usando valores por defecto.");
    } finally {
      setSavingP(false);
    }
  };

  const handleSaveMeta = async () => {
    setSavingM(true);
    setMsgM("");
    try {
      const res = await fetch("/api/configuracion-meta", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          pixel_id:        meta.pixel_id,
          capi_token:      meta.capi_token,
          test_event_code: meta.test_event_code,
        }),
      });
      setMsgM(res.ok ? "✅ Credenciales guardadas." : "❌ Error al guardar.");
    } catch {
      setMsgM("❌ Error de red.");
    } finally {
      setSavingM(false);
    }
  };

  const valorLabel = (() => {
    const n = Number(pipeline.valor_conversion);
    return isFinite(n) && n > 0 ? `${pipeline.moneda || "PEN"} ${n}` : "PEN 380";
  })();

  const col3Label = pipeline.col3_name.trim() || COL_DEFAULTS[2];
  const col4Label = pipeline.col4_name.trim() || COL_DEFAULTS[3];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#f7f6fc] h-full">
      <div className="max-w-2xl mx-auto space-y-8 pb-20">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Personaliza el pipeline, el cerebro de la IA y las credenciales de Meta.
          </p>
        </div>

        {/* Tarjeta 1: Pipeline y Negocio */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-800">Pipeline y Negocio</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#f0ecf9] text-[var(--color-lavender)] rounded-full uppercase">
              White Label
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Nombre del Asesor
              </label>
              <input
                type="text"
                value={pipeline.nombre_asesor}
                onChange={(e) => setPipeline({ ...pipeline, nombre_asesor: e.target.value })}
                placeholder="Ej. Paola"
                className={CLS_INPUT}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                WhatsApp de la Asesora
              </label>
              <input
                type="text"
                value={pipeline.whatsapp_asesor}
                onChange={(e) => setPipeline({ ...pipeline, whatsapp_asesor: e.target.value })}
                placeholder="Ej. 51999888777"
                className={CLS_INPUT}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Número con código de país, sin + ni espacios.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Tiempo de Respuesta del Bot
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={pipeline.bot_delay_s === "" ? 3 : pipeline.bot_delay_s}
                  onChange={(e) => setPipeline({ ...pipeline, bot_delay_s: Number(e.target.value) })}
                  className="flex-1 accent-[var(--color-lavender)]"
                />
                <span className="text-sm font-bold text-[var(--color-lavender)] w-16 text-right shrink-0">
                  {pipeline.bot_delay_s === "" ? 3 : pipeline.bot_delay_s}s
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Segundos antes de responder (1–30 s).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Valor de Conversión
              </label>
              <input
                type="number"
                min={0}
                value={pipeline.valor_conversion}
                onChange={(e) =>
                  setPipeline({ ...pipeline, valor_conversion: e.target.value === "" ? "" : Number(e.target.value) })
                }
                placeholder="380"
                className={CLS_INPUT}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Moneda
              </label>
              <select
                value={pipeline.moneda}
                onChange={(e) => setPipeline({ ...pipeline, moneda: e.target.value })}
                className={CLS_INPUT}
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="COP">COP</option>
                <option value="MXN">MXN</option>
                <option value="ARS">ARS</option>
                <option value="CLP">CLP</option>
              </select>
            </div>

          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Nombres de las Columnas del Kanban
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["col1_name", "col2_name", "col3_name", "col4_name"] as const).map((key, i) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1">
                    Columna {i + 1} — por defecto: "{COL_DEFAULTS[i]}"
                  </label>
                  <input
                    type="text"
                    value={pipeline[key]}
                    onChange={(e) => setPipeline({ ...pipeline, [key]: e.target.value })}
                    placeholder={COL_DEFAULTS[i]}
                    className={CLS_INPUT}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cerebro IA embebido */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">Cerebro de la IA</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full uppercase">
                Dinámica
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={cerebro.openai_api_key}
                onChange={(e) => setCerebro({ ...cerebro, openai_api_key: e.target.value })}
                placeholder="sk-... (Tu token secreto de OpenAI)"
                className={CLS_INPUT}
                autoComplete="off"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Las peticiones se facturarán directamente a tu cuenta de OpenAI.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Instrucciones Generales (Sistema Prompt)
              </label>
              <textarea
                value={cerebro.sistema_prompt}
                onChange={(e) => setCerebro({ ...cerebro, sistema_prompt: e.target.value })}
                placeholder={"Si está vacío, el bot usa la lógica interna por defecto.\n\nEscribe aquí el comportamiento base del asistente..."}
                rows={6}
                className={`${CLS_INPUT} resize-y font-mono text-xs`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Regla de Precalificación → Columna 2
              </label>
              <textarea
                value={cerebro.reglas_precalificar}
                onChange={(e) => setCerebro({ ...cerebro, reglas_precalificar: e.target.value })}
                placeholder={"Ej: Cuando el lead confirme interés en adquirir el servicio y mencione disponibilidad de presupuesto, añade [ACTION:QUALIFY] al final de tu respuesta."}
                rows={3}
                className={`${CLS_INPUT} resize-y text-xs`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Regla de Derivación → Columna 3
              </label>
              <textarea
                value={cerebro.reglas_derivar}
                onChange={(e) => setCerebro({ ...cerebro, reglas_derivar: e.target.value })}
                placeholder={"Ej: Cuando el lead haya respondido positivamente las preguntas de calificación y esté listo para hablar con un asesor, añade [ACTION:DERIVE] al final de tu respuesta."}
                rows={3}
                className={`${CLS_INPUT} resize-y text-xs`}
              />
            </div>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ⚠️ No se pudo cargar la configuración. Verifica que el servidor esté corriendo y recarga la página.
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-medium text-[var(--color-lavender)]">{msgP}</span>
            <button
              onClick={handleSavePipeline}
              disabled={savingP}
              className="text-white px-8 py-2.5 rounded-xl font-bold transition disabled:opacity-50 shadow-lg text-sm"
              style={{ background: "linear-gradient(135deg, var(--color-lavender) 0%, var(--color-violet-dim) 100%)", boxShadow: "0 4px 15px color-mix(in srgb, var(--color-lavender) 19%, transparent)" }}
            >
              {savingP ? "Guardando…" : "Guardar Configuración"}
            </button>
          </div>
        </div>

        {/* Tarjeta 3: Meta CAPI */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-800">Meta Conversions API</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full uppercase">
              Server-to-Server
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ID del Píxel de Meta
              </label>
              <input
                type="text"
                value={meta.pixel_id}
                onChange={(e) => setMeta({ ...meta, pixel_id: e.target.value })}
                placeholder="Ej. 1234567890123456"
                className={CLS_INPUT}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Test Event Code <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <input
                type="text"
                value={meta.test_event_code}
                onChange={(e) => setMeta({ ...meta, test_event_code: e.target.value })}
                placeholder="TEST12345"
                className={CLS_INPUT}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Access Token (CAPI)
              </label>
              <textarea
                value={meta.capi_token}
                onChange={(e) => setMeta({ ...meta, capi_token: e.target.value })}
                placeholder="EAAxxxxxxxxxxxxxxxx..."
                rows={3}
                className={`${CLS_INPUT} font-mono resize-none`}
              />
              <p className="text-xs text-gray-400 mt-1">
                Meta Business Suite → Píxeles → API de Conversiones → Configuración.
              </p>
            </div>

          </div>

          {meta.updated_at && (
            <p className="text-xs text-gray-400">
              Última actualización: {new Date(meta.updated_at).toLocaleString("es-PE")}
            </p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm font-medium text-blue-600">{msgM}</span>
            <button
              onClick={handleSaveMeta}
              disabled={savingM}
              className="text-white px-8 py-2.5 rounded-xl font-bold transition disabled:opacity-50 shadow-lg text-sm"
              style={{ background: "linear-gradient(135deg, var(--color-lavender) 0%, var(--color-violet-dim) 100%)", boxShadow: "0 4px 15px color-mix(in srgb, var(--color-lavender) 19%, transparent)" }}
            >
              {savingM ? "Guardando…" : "Guardar Credenciales"}
            </button>
          </div>
        </div>

        {/* Mapa de eventos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-1">Mapa de eventos configurados</h2>
          <p className="text-xs text-gray-400 mb-4">
            Disparadores automáticos. Los nombres y valores se actualizan al guardar.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs">
                <th className="px-3 py-2 font-semibold text-gray-600 rounded-l-lg">Evento</th>
                <th className="px-3 py-2 font-semibold text-gray-600">Etiqueta (columna)</th>
                <th className="px-3 py-2 font-semibold text-gray-600">Valor</th>
                <th className="px-3 py-2 font-semibold text-gray-600 rounded-r-lg">wamid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2.5 font-semibold text-blue-700">Lead</td>
                <td className="px-3 py-2.5 text-xs">
                  <span className="font-mono text-purple-700">ATENCION_COMERCIAL</span>
                  <span className="text-gray-400 ml-1">({col3Label})</span>
                </td>
                <td className="px-3 py-2.5 text-gray-400">—</td>
                <td className="px-3 py-2.5 text-gray-400">✓</td>
              </tr>
              <tr>
                <td className="px-3 py-2.5 font-semibold text-emerald-700">Purchase</td>
                <td className="px-3 py-2.5 text-xs">
                  <span className="font-mono text-emerald-700">PAGO_DIAGNOSTICO</span>
                  <span className="text-gray-400 ml-1">({col4Label})</span>
                </td>
                <td className="px-3 py-2.5 font-semibold text-gray-700">{valorLabel}</td>
                <td className="px-3 py-2.5 text-gray-400">✓</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
