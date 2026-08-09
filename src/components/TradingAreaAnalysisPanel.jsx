import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildTradingAreaCompanyMergedRows,
  buildTradingAreaCompanyRows,
  buildTradingAreaOutletRows,
  cumulativeForOutletRows,
  fiscalYearStartMonth,
  formatFiscalRangeLabel,
  formatMonth,
  formatMonthRange,
  formatRoundedNumber,
} from "../lib/analytics";
import { TradingAreaPerformanceTable, VolumeChange } from "./analysisShared";

export default function TradingAreaAnalysisPanel({
  taSelected,
  taView,
  latestMonth,
  outletsInAreaNorm,
  onBack,
}) {
  const data = useMemo(() => {
    const areaNorm = taSelected?.trading_area_norm || "";
    const areaOutletsBase = outletsInAreaNorm(areaNorm);
    const startMonth = fiscalYearStartMonth(latestMonth);
    const isCumulative = taView.period === "cumulative";
    const activeMetric = taView.metric;
    const areaOutlets = isCumulative
      ? areaOutletsBase.map((o) => {
          const sums = cumulativeForOutletRows(o.rows || [], startMonth, latestMonth);
          return { ...o, ms: sums.ms, ms_ly: sums.ms_ly, hsd: sums.hsd, hsd_ly: sums.hsd_ly };
        })
      : areaOutletsBase;

    const areaTotals = areaOutlets.reduce(
      (acc, o) => {
        acc.ms += Number(o.ms || 0);
        acc.ms_ly += Number(o.ms_ly || 0);
        acc.hsd += Number(o.hsd || 0);
        acc.hsd_ly += Number(o.hsd_ly || 0);
        return acc;
      },
      { ms: 0, ms_ly: 0, hsd: 0, hsd_ly: 0 }
    );

    const outletRows = buildTradingAreaOutletRows(areaOutlets, areaTotals);
    const companyRows = buildTradingAreaCompanyRows(areaOutlets);
    const companyMergedRows = buildTradingAreaCompanyMergedRows(companyRows);
    const outletCount = areaOutlets.length || 0;
    const areaAverages = {
      ms: outletCount ? areaTotals.ms / outletCount : 0,
      hsd: outletCount ? areaTotals.hsd / outletCount : 0,
    };

    return {
      activeMetric,
      areaAverages,
      areaOutlets,
      areaTotals,
      companyMergedRows,
      cumulativeRangeLabel: formatMonthRange(startMonth, latestMonth),
      isCumulative,
      metricLabel: activeMetric === "combined" ? "Combined" : activeMetric === "ms" ? "MS" : "HSD",
      outletCount,
      outletRows,
      periodLabel: isCumulative ? formatFiscalRangeLabel(startMonth, latestMonth) : formatMonth(latestMonth),
    };
  }, [latestMonth, outletsInAreaNorm, taSelected, taView.metric, taView.period]);

  const {
    activeMetric,
    areaAverages,
    areaTotals,
    companyMergedRows,
    cumulativeRangeLabel,
    isCumulative,
    metricLabel,
    outletCount,
    outletRows,
    periodLabel,
  } = data;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`ta-${taSelected?.trading_area_norm || ""}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
      >
        <div className="panel-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to trading area rankings"
                  title="IOC"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: "none",
                    background: "#F8FAFC",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                >
                  <img
                    src="/logos/IOC.svg"
                    alt="IOC"
                    style={{ width: 24, height: 24, objectFit: "contain" }}
                  />
                </button>
                <h2 style={{ margin: 0, fontSize: "var(--font-xl)" }}>{taSelected?.trading_area}</h2>
              </div>
              <div style={{ color: "#64748B", marginTop: 6, fontSize: "var(--font-sm)" }}>Trading area analysis</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              className="metric-summary-grid"
              style={{
                gridTemplateColumns: activeMetric === "combined" ? "repeat(11, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))",
              }}
            >
              <div className="metric-summary-label">Period</div>
              <div className="metric-summary-label">Outlets</div>
              {activeMetric === "combined" ? (
                <>
                  <div className="metric-summary-label">MS</div>
                  <div className="metric-summary-label">MS LY</div>
                  <div className="metric-summary-label">MS Change</div>
                  <div className="metric-summary-label">Avg MS</div>
                  <div className="metric-summary-label">HSD</div>
                  <div className="metric-summary-label">HSD LY</div>
                  <div className="metric-summary-label">HSD Change</div>
                  <div className="metric-summary-label">Avg HSD</div>
                </>
              ) : (
                <>
                  <div className="metric-summary-label">{metricLabel}</div>
                  <div className="metric-summary-label">{metricLabel} LY</div>
                  <div className="metric-summary-label">{metricLabel} Change</div>
                  <div className="metric-summary-label">Avg {metricLabel}</div>
                </>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={isCumulative ? "ta-cumulative" : "ta-monthly"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: "grid",
                  gridTemplateColumns: activeMetric === "combined" ? "repeat(11, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))",
                  gap: "clamp(10px, 1vw, 14px)",
                  alignItems: "center",
                }}
              >
                <div className="metric-summary-value" style={{ fontWeight: 600 }}>{periodLabel}</div>
                <div className="metric-summary-value-strong">{outletCount}</div>
                {activeMetric === "combined" ? (
                  <>
                    <div className="metric-summary-value-strong">{formatRoundedNumber(areaTotals.ms)}</div>
                    <div className="metric-summary-value">{formatRoundedNumber(areaTotals.ms_ly)}</div>
                    <div>
                      <VolumeChange curr={areaTotals.ms} prev={areaTotals.ms_ly} />
                    </div>
                    <div className="metric-summary-value">{formatRoundedNumber(areaAverages.ms)}</div>
                    <div className="metric-summary-value-strong">{formatRoundedNumber(areaTotals.hsd)}</div>
                    <div className="metric-summary-value">{formatRoundedNumber(areaTotals.hsd_ly)}</div>
                    <div>
                      <VolumeChange curr={areaTotals.hsd} prev={areaTotals.hsd_ly} />
                    </div>
                    <div className="metric-summary-value">{formatRoundedNumber(areaAverages.hsd)}</div>
                  </>
                ) : (
                  <>
                    <div className="metric-summary-value-strong">{formatRoundedNumber(activeMetric === "ms" ? areaTotals.ms : areaTotals.hsd)}</div>
                    <div className="metric-summary-value">{formatRoundedNumber(activeMetric === "ms" ? areaTotals.ms_ly : areaTotals.hsd_ly)}</div>
                    <div>
                      <VolumeChange
                        curr={activeMetric === "ms" ? areaTotals.ms : areaTotals.hsd}
                        prev={activeMetric === "ms" ? areaTotals.ms_ly : areaTotals.hsd_ly}
                      />
                    </div>
                    <div className="metric-summary-value">{formatRoundedNumber(activeMetric === "ms" ? areaAverages.ms : areaAverages.hsd)}</div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <TradingAreaPerformanceTable
            rows={outletRows}
            label={`${metricLabel} Outlets${isCumulative ? ` • ${cumulativeRangeLabel}` : ""}`}
            firstColumnLabel="Outlet"
            includeCompany
            metric={activeMetric}
          />

          <TradingAreaPerformanceTable
            rows={companyMergedRows}
            label={`${metricLabel} by Company`}
            firstColumnLabel="Company"
            metric={activeMetric}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
