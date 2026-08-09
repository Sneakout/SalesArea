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
        <div className="panel-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "var(--font-xl)" }}>{selected?.name}</h2>
              <div style={{ color: "#64748B", marginTop: 6, fontSize: "var(--font-sm)" }}>
                {selected?.company} • {selected?.trading_area}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => onSetPageIndex(0)}
                aria-label="Monthly view"
                title="Monthly view"
                className="nav-btn"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: "#F8FAFC",
                  cursor: "pointer",
                  opacity: pageIndex === 0 ? 1 : 0.7,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button
                onClick={() => onSetPageIndex(1)}
                aria-label="Cumulative view"
                title="Cumulative (Apr → latest)"
                className="nav-btn"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: "none",
                  background: "#F8FAFC",
                  cursor: "pointer",
                  opacity: pageIndex === 1 ? 1 : 0.7,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="metric-summary-grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              <div className="metric-summary-label">Month</div>
              <div className="metric-summary-label">MS</div>
              <div className="metric-summary-label">MS LY</div>
              <div className="metric-summary-label">MS Change</div>
              <div className="metric-summary-label">HSD</div>
              <div className="metric-summary-label">HSD LY</div>
              <div className="metric-summary-label">HSD Change</div>
            </div>

            <AnimatePresence mode="wait">
              {pageIndex === 1 ? (
                <motion.div
                  key="cumulative"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="metric-summary-grid"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                >
                  <div className="metric-summary-value" style={{ fontWeight: 600 }}>Cumulative</div>
                  <div className="metric-summary-value-strong">{formatRoundedNumber(cumulativeSums?.ms)}</div>
                  <div className="metric-summary-value">{formatRoundedNumber(cumulativeSums?.ms_ly)}</div>
                  <div>
                    <VolumeChange curr={cumulativeSums?.ms ?? 0} prev={cumulativeSums?.ms_ly ?? 0} />
                  </div>
                  <div className="metric-summary-value-strong">{formatRoundedNumber(cumulativeSums?.hsd)}</div>
                  <div className="metric-summary-value">{formatRoundedNumber(cumulativeSums?.hsd_ly)}</div>
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
                  className="metric-summary-grid"
                  style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
                >
                  <div className="metric-summary-value">{formatMonth(selected?.month)}</div>
                  <div className="metric-summary-value-strong">{formatRoundedNumber(selected?.ms)}</div>
                  <div className="metric-summary-value">{formatRoundedNumber(selected?.ms_ly)}</div>
                  <div>
                    <VolumeChange curr={selected?.ms} prev={selected?.ms_ly} />
                  </div>
                  <div className="metric-summary-value-strong">{formatRoundedNumber(selected?.hsd)}</div>
                  <div className="metric-summary-value">{formatRoundedNumber(selected?.hsd_ly)}</div>
                  <div>
                    <VolumeChange curr={selected?.hsd} prev={selected?.hsd_ly} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: 6 }}>
              Trading Area Outlets
              <AnimatePresence mode="wait">
              <motion.span
                  key={pageIndex === 1 ? "outlets-cumulative-title" : "outlets-monthly-title"}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3 }}
                  style={{ fontWeight: 400, fontSize: "var(--font-sm)", color: "#64748B" }}
                >
                  ({periodTitle})
                </motion.span>
              </AnimatePresence>
            </h3>

            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Outlet</th>
                    <th>Company</th>
                    <th>MS</th>
                    <th>MS LY</th>
                    <th>Volume Change</th>
                    <th>HSD</th>
                    <th>HSD LY</th>
                    <th>Volume Change</th>
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
                          <td>{o.name}</td>
                          <td>{o.company}</td>
                          <td>{formatRoundedNumber(o.ms)}</td>
                          <td>{formatRoundedNumber(o.ms_ly)}</td>
                          <td>
                            <VolumeChange curr={o.ms} prev={o.ms_ly} />
                          </td>
                          <td>{formatRoundedNumber(o.hsd)}</td>
                          <td>{formatRoundedNumber(o.hsd_ly)}</td>
                          <td>
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

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 8px 0" }}>Trading Area Market Share</h3>
            <div className="data-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Market Share</th>
                    <th>Market Share (LY)</th>
                    <th>Change</th>
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
                          <td>{m.company}</td>
                          <td>{(m.share || 0).toFixed(2)}%</td>
                          <td>{(m.share_ly || 0).toFixed(2)}%</td>
                          <td>
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
