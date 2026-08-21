import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  computeCumulativeMarketShareForArea,
  cumulativeForOutletRows,
  fiscalYearStartMonth,
  formatMonth,
  formatRoundedNumber,
} from "../lib/analytics";
import { ShareChange, VolumeChange } from "./analysisShared";

function computeMonthlyMarketShare(areaNorm, outletsInAreaNorm) {
  const outs = outletsInAreaNorm(areaNorm);
  const totals = outs.reduce((acc, o) => {
    const comp = (o.company || "PVT").toUpperCase();
    acc[comp] = acc[comp] || { ms: 0, ms_ly: 0 };
    acc[comp].ms += Number(o.ms || 0);
    acc[comp].ms_ly += Number(o.ms_ly || 0);
    return acc;
  }, {});
  const totalMs = Object.values(totals).reduce((sum, item) => sum + item.ms, 0);
  const totalMsLy = Object.values(totals).reduce((sum, item) => sum + item.ms_ly, 0);

  return Object.entries(totals)
    .map(([company, vals]) => ({
      company,
      share: totalMs ? (vals.ms / totalMs) * 100 : 0,
      share_ly: totalMsLy ? (vals.ms_ly / totalMsLy) * 100 : 0,
      share_change: totalMs && totalMsLy ? (vals.ms / totalMs) * 100 - (vals.ms_ly / totalMsLy) * 100 : 0,
    }))
    .sort((a, b) => b.share - a.share);
}

export default function OutletAnalysisPanel({
  selected,
  pageIndex,
  latestMonth,
  cumulativeSums,
  outletsInAreaNorm,
  onSetPageIndex,
  onBack,
}) {
  const data = useMemo(() => {
    const areaNorm = selected?.trading_area_norm || (selected?.trading_area || "").toLowerCase();
    let outlets = outletsInAreaNorm(areaNorm);

    if (pageIndex === 1) {
      const startMonth = fiscalYearStartMonth(latestMonth);
      outlets = outlets.map((o) => {
        const sums = cumulativeForOutletRows(o.rows || [], startMonth, latestMonth);
        return { ...o, ms: sums.ms, ms_ly: sums.ms_ly, hsd: sums.hsd, hsd_ly: sums.hsd_ly };
      });
    }

    const shareRows = areaNorm
      ? pageIndex === 1
        ? computeCumulativeMarketShareForArea(outletsInAreaNorm(areaNorm), fiscalYearStartMonth(latestMonth), latestMonth)
        : computeMonthlyMarketShare(areaNorm, outletsInAreaNorm)
      : [];

    return { areaNorm, outlets, shareRows };
  }, [latestMonth, outletsInAreaNorm, pageIndex, selected]);

  const periodTitle = pageIndex === 1 ? `Apr to ${formatMonth(latestMonth)}` : formatMonth(selected?.month);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={selected?.outlet_id ?? selected?.id ?? selected?.name}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
            padding: "4px 0 14px",
            borderBottom: "1px solid #E2E8F0",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to previous analysis screen"
                  title="Back"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    background: "#FFFFFF",
                    color: "#334155",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                    flex: "0 0 auto",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : null}
              <div>
                <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase" }}>Outlet</div>
                <h2 style={{ margin: "2px 0 0" }}>{selected?.name}</h2>
                <div style={{ color: "#64748B", marginTop: 3, fontSize: 13 }}>
                  {selected?.company} • {selected?.trading_area}
                </div>
              </div>
            </div>

            <div>
              <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".05em" }}>Period</div>
              <div style={{ display: "inline-flex", padding: 3, borderRadius: 9, background: "#F1F5F9" }}>
                {[{ value: 0, label: "Month" }, { value: 1, label: "Cumulative" }].map((option) => {
                  const active = pageIndex === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSetPageIndex(option.value)}
                      aria-pressed={active}
                      style={{
                        border: "none",
                        borderRadius: 7,
                        padding: "6px 10px",
                        background: active ? "#FFFFFF" : "transparent",
                        color: active ? "#0F172A" : "#64748B",
                        boxShadow: active ? "0 1px 3px rgba(15,23,42,.12)" : "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >{option.label}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, border: "1px solid #E2E8F0", borderRadius: 12, background: "#F8FAFC" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>Month</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>MS CY</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>MS LY</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>MS Change</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>HSD CY</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>HSD LY</div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 700 }}>HSD Change</div>
            </div>

            <AnimatePresence mode="wait">
              {pageIndex === 1 ? (
                <motion.div
                  key="cumulative"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, alignItems: "center" }}
                >
                  <div style={{ fontWeight: 600 }}>Cumulative</div>
                  <div style={{ fontWeight: 700 }}>{formatRoundedNumber(cumulativeSums?.ms)}</div>
                  <div>{formatRoundedNumber(cumulativeSums?.ms_ly)}</div>
                  <div>
                    <VolumeChange curr={cumulativeSums?.ms ?? 0} prev={cumulativeSums?.ms_ly ?? 0} />
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatRoundedNumber(cumulativeSums?.hsd)}</div>
                  <div>{formatRoundedNumber(cumulativeSums?.hsd_ly)}</div>
                  <div>
                    <VolumeChange curr={cumulativeSums?.hsd ?? 0} prev={cumulativeSums?.hsd_ly ?? 0} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="monthly"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12, alignItems: "center" }}
                >
                  <div>{formatMonth(selected?.month)}</div>
                  <div style={{ fontWeight: 700 }}>{formatRoundedNumber(selected?.ms)}</div>
                  <div>{formatRoundedNumber(selected?.ms_ly)}</div>
                  <div>
                    <VolumeChange curr={selected?.ms} prev={selected?.ms_ly} />
                  </div>
                  <div style={{ fontWeight: 700 }}>{formatRoundedNumber(selected?.hsd)}</div>
                  <div>{formatRoundedNumber(selected?.hsd_ly)}</div>
                  <div>
                    <VolumeChange curr={selected?.hsd} prev={selected?.hsd_ly} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              Outlets in {selected?.trading_area}
              <AnimatePresence mode="wait">
                <motion.span
                  key={pageIndex === 1 ? "outlets-cumulative-title" : "outlets-monthly-title"}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontWeight: 500, fontSize: 12, color: "#64748B" }}
                >
                  {periodTitle}
                </motion.span>
              </AnimatePresence>
            </h3>

            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 10, boxShadow: "0 1px 2px rgba(2,6,23,0.04)" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead style={{ color: "#94A3B8", textAlign: "left" }}>
                  <tr>
                    <th style={{ padding: "8px 6px", textAlign: "left" }}>Outlet</th>
                    <th style={{ padding: "8px 6px", textAlign: "left" }}>Company</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>MS CY</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>MS LY</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Volume Change</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>HSD CY</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>HSD LY</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Volume Change</th>
                  </tr>
                </thead>
                <AnimatePresence mode="wait">
                  <motion.tbody
                    key={pageIndex === 1 ? "outlets-cumulative" : "outlets-monthly"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {!data.outlets || data.outlets.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 16, color: "#64748B" }}>
                          No outlets found in this trading area.
                        </td>
                      </tr>
                    ) : (
                      data.outlets.map((o, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "8px 6px", textAlign: "left" }}>{o.name}</td>
                          <td style={{ padding: "8px 6px", textAlign: "left" }}>{o.company}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{formatRoundedNumber(o.ms)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{formatRoundedNumber(o.ms_ly)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>
                            <VolumeChange curr={o.ms} prev={o.ms_ly} />
                          </td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{formatRoundedNumber(o.hsd)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{formatRoundedNumber(o.hsd_ly)}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>
                            <VolumeChange curr={o.hsd} prev={o.hsd_ly} />
                          </td>
                        </tr>
                      ))
                    )}
                  </motion.tbody>
                </AnimatePresence>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ margin: "0 0 10px 0" }}>Market share in {selected?.trading_area}</h3>
            <div style={{ width: "min(100%, 960px)", boxSizing: "border-box", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 12, boxShadow: "0 1px 2px rgba(2,6,23,0.04)" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "24%" }} />
                </colgroup>
                <thead style={{ color: "#94A3B8", textAlign: "left" }}>
                  <tr>
                    <th style={{ padding: "8px 6px", textAlign: "left" }}>Company</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Market Share (CY)</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Market Share (LY)</th>
                    <th style={{ padding: "8px 6px", textAlign: "right" }}>Change</th>
                  </tr>
                </thead>
                <AnimatePresence mode="wait">
                  <motion.tbody
                    key={pageIndex === 1 ? "marketshare-cumulative" : "marketshare-monthly"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    {!data.shareRows || data.shareRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 16, color: "#64748B" }}>
                          No market-share data available for this trading area.
                        </td>
                      </tr>
                    ) : (
                      data.shareRows.map((m, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "8px 6px", textAlign: "left" }}>{m.company}</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{(m.share || 0).toFixed(2)}%</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>{(m.share_ly || 0).toFixed(2)}%</td>
                          <td style={{ padding: "8px 6px", textAlign: "right" }}>
                            <ShareChange value={m.share_change || 0} />
                          </td>
                        </tr>
                      ))
                    )}
                  </motion.tbody>
                </AnimatePresence>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
