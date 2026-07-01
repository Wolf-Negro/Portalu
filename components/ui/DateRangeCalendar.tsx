"use client";
import { useState, useCallback } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  isSameDay, isWithinInterval, isBefore, isAfter,
  addMonths, subMonths, getDay, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

interface Preset { label: string; days: number; single: boolean; }

interface Props {
  onApply: (since: string, until: string, label: string) => void;
  onClose: () => void;
  presets: Preset[];
  onPresetApply: (p: Preset) => void;
  activeLabel?: string | null;
  onClear?: () => void;
}

const DAYS = ["L","M","X","J","V","S","D"];

function toISO(d: Date) { return format(d, "yyyy-MM-dd"); }
function toLabel(d: Date) { return format(d, "d 'de' MMMM 'de' yyyy", { locale: es }); }

export default function DateRangeCalendar({ onApply, onClose, presets, onPresetApply, activeLabel, onClear }: Props) {
  const today = startOfDay(new Date());
  const [leftMonth, setLeftMonth] = useState(today);
  const rightMonth = addMonths(leftMonth, 1);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate]     = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [step, setStep] = useState<"start" | "end">("start");

  const handleDayClick = useCallback((day: Date) => {
    if (step === "start") {
      setStartDate(day); setEndDate(null); setStep("end");
    } else {
      if (isBefore(day, startDate!)) {
        setStartDate(day); setEndDate(null); setStep("end");
      } else {
        setEndDate(day); setStep("start");
      }
    }
  }, [step, startDate]);

  const effectiveEnd = step === "end" && hoverDate && startDate
    ? (isBefore(hoverDate, startDate) ? startDate : hoverDate)
    : endDate;

  const inRange = (day: Date) => {
    if (!startDate || !effectiveEnd) return false;
    const lo = isBefore(startDate, effectiveEnd) ? startDate : effectiveEnd;
    const hi = isBefore(startDate, effectiveEnd) ? effectiveEnd : startDate;
    return isWithinInterval(day, { start: lo, end: hi });
  };

  const isStart = (day: Date) => startDate ? isSameDay(day, startDate) : false;
  const isEnd   = (day: Date) => effectiveEnd ? isSameDay(day, effectiveEnd) : false;

  function renderMonth(month: Date, showNavPrev: boolean, showNavNext: boolean) {
    const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const firstDow = (getDay(days[0]) + 6) % 7; // monday=0

    return (
      <div style={{ minWidth: 200 }}>
        {/* Month header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          {showNavPrev ? (
            <button onClick={() => setLeftMonth((m) => subMonths(m, 1))}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#64748b", display:"flex",alignItems:"center",justifyContent:"center" }}>
              ‹
            </button>
          ) : <span style={{ width: 28 }} />}

          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
            {format(month, "MMMM yyyy", { locale: es })}
          </span>

          {showNavNext ? (
            <button onClick={() => setLeftMonth((m) => addMonths(m, 1))}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 14, color: "#64748b", display:"flex",alignItems:"center",justifyContent:"center" }}>
              ›
            </button>
          ) : <span style={{ width: 28 }} />}
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "2px 0" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {/* empty cells for first row offset */}
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((day) => {
            const sel = isStart(day) || isEnd(day);
            const range = inRange(day) && !sel;
            const isToday = isSameDay(day, today);
            const future = isAfter(day, today);
            return (
              <div
                key={day.toISOString()}
                onClick={() => !future && handleDayClick(day)}
                onMouseEnter={() => setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                style={{
                  height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: sel ? "50%" : range ? 0 : 6,
                  background: sel ? "#7c3aed" : range ? "#ede9fe" : "transparent",
                  color: sel ? "#fff" : future ? "#cbd5e1" : isToday ? "#7c3aed" : "#1e293b",
                  fontSize: 12, fontWeight: sel || isToday ? 700 : 400,
                  cursor: future ? "not-allowed" : "pointer",
                  transition: "all 0.1s",
                }}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const canApply = startDate && endDate;
  const sinceStr = startDate ? toISO(startDate) : "";
  const untilStr = endDate   ? toISO(endDate)   : "";

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, width: 520, boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)" }}>
      {/* Presets */}
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
        Seleccionar período
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 14 }}>
        {presets.map((p) => {
          const isActive = activeLabel === p.label;
          return (
            <button key={p.label} onClick={() => onPresetApply(p)}
              style={{
                padding: "6px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 11.5, fontWeight: isActive ? 700 : 500,
                background: isActive ? "#7c3aed" : "#f8fafc",
                color: isActive ? "#fff" : "#475569",
                boxShadow: isActive ? "0 4px 12px rgba(124,58,237,0.25)" : "none",
                transition: "all 0.15s",
              }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#f1f5f9", margin: "0 0 14px" }} />

      {/* Dual calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {renderMonth(leftMonth,  true,  false)}
        {renderMonth(rightMonth, false, true)}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          {startDate && endDate
            ? <><span style={{ color: "#7c3aed", fontWeight: 700 }}>{toLabel(startDate)}</span> — <span style={{ color: "#7c3aed", fontWeight: 700 }}>{toLabel(endDate)}</span></>
            : startDate
            ? <><span style={{ color: "#7c3aed", fontWeight: 700 }}>{toLabel(startDate)}</span> <span style={{ color: "#94a3b8" }}>— selecciona fin</span></>
            : <span style={{ color: "#94a3b8" }}>Haz clic para seleccionar inicio</span>
          }
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onClear && (
            <button onClick={onClear}
              style={{ padding: "7px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
              Quitar
            </button>
          )}
          <button onClick={onClose}
            style={{ padding: "7px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={() => canApply && onApply(sinceStr, untilStr, `${sinceStr} → ${untilStr}`)}
            disabled={!canApply}
            style={{
              padding: "7px 20px", background: canApply ? "linear-gradient(135deg,#2b096f,#7255b4)" : "#e2e8f0",
              border: "none", borderRadius: 10, cursor: canApply ? "pointer" : "not-allowed",
              fontSize: 12, fontWeight: 700, color: canApply ? "#fff" : "#94a3b8",
            }}>
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
