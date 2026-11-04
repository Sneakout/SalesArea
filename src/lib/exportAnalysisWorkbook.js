import {
  buildIOCLossTradingAreaRows,
  calcGrowth,
  formatMonth,
  marketShareRowsAllMonthly_HSD,
  marketShareRowsAllMonthly_MS,
} from "./analytics.js";

const COLORS = {
  navy: "17233C",
  slate: "64748B",
  paleBlue: "EAF2FF",
  paleSlate: "F8FAFC",
  border: "DCE5F0",
  white: "FFFFFF",
  green: "0F6B56",
  greenFill: "E7F8F1",
  red: "9B2C2C",
  redFill: "FDECEC",
};

const thinBorder = {
  top: { style: "thin", color: { argb: COLORS.border } },
  left: { style: "thin", color: { argb: COLORS.border } },
  bottom: { style: "thin", color: { argb: COLORS.border } },
  right: { style: "thin", color: { argb: COLORS.border } },
};

function applySheetDefaults(sheet, widths, frozenRows = 4) {
  sheet.properties.defaultRowHeight = 20;
  sheet.views = [{ state: "frozen", ySplit: frozenRows, activeCell: `A${frozenRows + 1}` }];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function addSheetHeading(sheet, title, subtitle, lastColumn) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { name: "Aptos Display", size: 18, bold: true, color: { argb: COLORS.navy } };
  titleCell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(`A2:${lastColumn}2`);
  const subtitleCell = sheet.getCell("A2");
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: "Aptos", size: 10, color: { argb: COLORS.slate } };
  subtitleCell.alignment = { vertical: "middle" };
  sheet.getRow(2).height = 20;
}

function styleHeaderRow(row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
  });
}

function styleDataRange(sheet, startRow, endRow, endColumn) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 23;
    for (let column = 1; column <= endColumn; column += 1) {
      const cell = row.getCell(column);
      cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.navy } };
      cell.alignment = { vertical: "middle", horizontal: column === 1 ? "left" : "right" };
      cell.border = thinBorder;
      if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleSlate } };
      }
    }
  }
}

function styleChangeCell(cell, value, format = '#,##0.0;[Red]-#,##0.0;0.0') {
  const numeric = Number(value || 0);
  cell.numFmt = format;
  cell.font = {
    name: "Aptos",
    size: 10,
    bold: true,
    color: { argb: numeric >= 0 ? COLORS.green : COLORS.red },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: numeric >= 0 ? COLORS.greenFill : COLORS.redFill },
  };
}

function addSectionLabel(sheet, rowNumber, text, lastColumn) {
  sheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
  cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: COLORS.navy } };
  cell.alignment = { vertical: "middle" };
  cell.border = thinBorder;
  sheet.getRow(rowNumber).height = 25;
}

function addOverviewSheet(workbook, activeStations, month, msRows, hsdRows) {
  const sheet = workbook.addWorksheet("Overview", { properties: { tabColor: { argb: "3B82F6" } } });
  applySheetDefaults(sheet, [30, 22, 60], 4);
  addSheetHeading(
    sheet,
    "Sales Area Analysis",
    `${formatMonth(month)} | Industry scope | All classes of market`,
    "C"
  );

  const msTotal = msRows.find((row) => row.isTotal) || {};
  const hsdTotal = hsdRows.find((row) => row.isTotal) || {};
  const combinedCurr = Number(msTotal.curr || 0) + Number(hsdTotal.curr || 0);
  const combinedLast = Number(msTotal.last || 0) + Number(hsdTotal.last || 0);

  const header = sheet.getRow(4);
  header.values = ["Metric", "Value", "Notes"];
  styleHeaderRow(header);

  const overviewRows = [
    ["Selected month", formatMonth(month), "Data shown throughout this workbook"],
    ["Scope", "Industry", "All companies and classes of market"],
    ["RO count", activeStations.length, "ROs with data in the selected month"],
    ["MS sales CY", Number(msTotal.curr || 0), "Selected-month industry volume"],
    ["MS sales LY", Number(msTotal.last || 0), "Same month last year"],
    ["MS change", Number(msTotal.growth || 0), "CY minus LY"],
    ["MS growth", Number(msTotal.growthPct || 0) / 100, "Percentage change from LY"],
    ["HSD sales CY", Number(hsdTotal.curr || 0), "Selected-month industry volume"],
    ["HSD sales LY", Number(hsdTotal.last || 0), "Same month last year"],
    ["HSD change", Number(hsdTotal.growth || 0), "CY minus LY"],
    ["HSD growth", Number(hsdTotal.growthPct || 0) / 100, "Percentage change from LY"],
    ["Combined sales CY", combinedCurr, "MS + HSD"],
    ["Combined sales LY", combinedLast, "MS + HSD, same month last year"],
    ["Combined change", combinedCurr - combinedLast, "CY minus LY"],
    ["Combined growth", calcGrowth(combinedCurr, combinedLast) / 100, "Percentage change from LY"],
  ];

  overviewRows.forEach((values) => sheet.addRow(values));
  styleDataRange(sheet, 5, 4 + overviewRows.length, 3);
  [7, 8, 9, 10, 12, 13, 14, 16, 17, 18].forEach((rowNumber) => {
    sheet.getCell(rowNumber, 2).numFmt = "#,##0.0";
  });
  [11, 15, 19].forEach((rowNumber) => {
    sheet.getCell(rowNumber, 2).numFmt = "0.0%";
  });
  sheet.autoFilter = { from: "A4", to: `C${4 + overviewRows.length}` };
  return sheet;
}

function addMarketShareSheet(workbook, month, msRows, hsdRows) {
  const sheet = workbook.addWorksheet("Market Share", { properties: { tabColor: { argb: "14B8A6" } } });
  const widths = [15, 13, 13, 13, 12, 13, 13, 14, 13, 13, 13, 12, 13, 13, 14];
  applySheetDefaults(sheet, widths, 4);
  addSheetHeading(
    sheet,
    "Market Share",
    `${formatMonth(month)} | Industry scope | Sales volumes and share movement by company`,
    "O"
  );

  const headers = [
    "Company",
    "MS CY",
    "MS LY",
    "MS Change",
    "MS Growth %",
    "MS Share CY",
    "MS Share LY",
    "MS Share Change",
    "HSD CY",
    "HSD LY",
    "HSD Change",
    "HSD Growth %",
    "HSD Share CY",
    "HSD Share LY",
    "HSD Share Change",
  ];
  const header = sheet.getRow(4);
  header.values = headers;
  styleHeaderRow(header);

  const msByCompany = new Map(msRows.map((row) => [row.company, row]));
  const hsdByCompany = new Map(hsdRows.map((row) => [row.company, row]));
  const companyNames = Array.from(new Set([
    ...msRows.filter((row) => !row.isTotal).map((row) => row.company),
    ...hsdRows.filter((row) => !row.isTotal).map((row) => row.company),
  ])).sort((a, b) => {
    const aTotal = Number(msByCompany.get(a)?.curr || 0) + Number(hsdByCompany.get(a)?.curr || 0);
    const bTotal = Number(msByCompany.get(b)?.curr || 0) + Number(hsdByCompany.get(b)?.curr || 0);
    return bTotal - aTotal || a.localeCompare(b);
  });
  companyNames.push("Total");

  companyNames.forEach((company) => {
    const ms = msByCompany.get(company) || {};
    const hsd = hsdByCompany.get(company) || {};
    sheet.addRow([
      company,
      Number(ms.curr || 0),
      Number(ms.last || 0),
      Number(ms.growth || 0),
      Number(ms.growthPct || 0) / 100,
      Number(ms.share || 0) / 100,
      Number(ms.share_ly || 0) / 100,
      Number(ms.share_change || 0),
      Number(hsd.curr || 0),
      Number(hsd.last || 0),
      Number(hsd.growth || 0),
      Number(hsd.growthPct || 0) / 100,
      Number(hsd.share || 0) / 100,
      Number(hsd.share_ly || 0) / 100,
      Number(hsd.share_change || 0),
    ]);
  });

  const lastRow = 4 + companyNames.length;
  styleDataRange(sheet, 5, lastRow, headers.length);
  for (let row = 5; row <= lastRow; row += 1) {
    [2, 3, 4, 9, 10, 11].forEach((column) => { sheet.getCell(row, column).numFmt = "#,##0.0"; });
    [5, 6, 7, 12, 13, 14].forEach((column) => { sheet.getCell(row, column).numFmt = "0.00%"; });
    styleChangeCell(sheet.getCell(row, 4), sheet.getCell(row, 4).value);
    styleChangeCell(sheet.getCell(row, 8), sheet.getCell(row, 8).value, '0.00 "pp";[Red]-0.00 "pp";0.00 "pp"');
    styleChangeCell(sheet.getCell(row, 11), sheet.getCell(row, 11).value);
    styleChangeCell(sheet.getCell(row, 15), sheet.getCell(row, 15).value, '0.00 "pp";[Red]-0.00 "pp";0.00 "pp"');
  }
  const totalRow = sheet.getRow(lastRow);
  totalRow.font = { name: "Aptos", size: 10, bold: true, color: { argb: COLORS.navy } };
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
  });
  sheet.autoFilter = { from: "A4", to: `O${lastRow}` };
  return sheet;
}

function addRoSalesSheet(workbook, month, activeStations) {
  const sheet = workbook.addWorksheet("RO Sales", { properties: { tabColor: { argb: "8B5CF6" } } });
  const widths = [14, 30, 12, 24, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 14, 13];
  applySheetDefaults(sheet, widths, 4);
  addSheetHeading(
    sheet,
    "RO-wise Sales",
    `${formatMonth(month)} | Every RO with selected-month data | CY compared with LY`,
    "Q"
  );

  const headers = [
    "Outlet ID",
    "RO Name",
    "Company",
    "Trading Area",
    "Class of Market",
    "MS CY",
    "MS LY",
    "MS Change",
    "MS Growth %",
    "HSD CY",
    "HSD LY",
    "HSD Change",
    "HSD Growth %",
    "Total CY",
    "Total LY",
    "Total Change",
    "Total Growth %",
  ];
  const header = sheet.getRow(4);
  header.values = headers;
  styleHeaderRow(header);

  const sortedStations = [...activeStations].sort((a, b) =>
    (a.company || "").localeCompare(b.company || "") ||
    (a.trading_area || "").localeCompare(b.trading_area || "") ||
    (a.name || "").localeCompare(b.name || "")
  );

  sortedStations.forEach((station) => {
    const msCy = Number(station.ms || 0);
    const msLy = Number(station.ms_ly || 0);
    const hsdCy = Number(station.hsd || 0);
    const hsdLy = Number(station.hsd_ly || 0);
    const totalCy = msCy + hsdCy;
    const totalLy = msLy + hsdLy;
    sheet.addRow([
      String(station.outlet_id || station.id || ""),
      station.name || "",
      station.company || "",
      station.trading_area || "",
      station.class_of_market || "",
      msCy,
      msLy,
      msCy - msLy,
      calcGrowth(msCy, msLy) / 100,
      hsdCy,
      hsdLy,
      hsdCy - hsdLy,
      calcGrowth(hsdCy, hsdLy) / 100,
      totalCy,
      totalLy,
      totalCy - totalLy,
      calcGrowth(totalCy, totalLy) / 100,
    ]);
  });

  const lastRow = 4 + sortedStations.length;
  if (lastRow >= 5) {
    styleDataRange(sheet, 5, lastRow, headers.length);
    for (let row = 5; row <= lastRow; row += 1) {
      [6, 7, 8, 10, 11, 12, 14, 15, 16].forEach((column) => { sheet.getCell(row, column).numFmt = "#,##0.0"; });
      [9, 13, 17].forEach((column) => { sheet.getCell(row, column).numFmt = "0.0%"; });
      [8, 12, 16].forEach((column) => styleChangeCell(sheet.getCell(row, column), sheet.getCell(row, column).value));
    }
    sheet.autoFilter = { from: "A4", to: `Q${lastRow}` };
  }
  return sheet;
}

function addLossSection(sheet, startRow, label, rows) {
  addSectionLabel(sheet, startRow, label, "I");
  const headerRow = sheet.getRow(startRow + 1);
  headerRow.values = [
    "Rank",
    "Trading Area",
    "IOC CY Sales",
    "IOC LY Sales",
    "Volume Change",
    "Growth %",
    "IOC Share CY",
    "IOC Share LY",
    "Share Change",
  ];
  styleHeaderRow(headerRow);

  rows.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.area,
      Number(row.curr || 0),
      Number(row.last || 0),
      Number(row.growth || 0),
      Number(row.growthPct || 0) / 100,
      Number(row.share || 0) / 100,
      Number(row.share_ly || 0) / 100,
      Number(row.share_change || 0),
    ]);
  });

  const dataStart = startRow + 2;
  const dataEnd = dataStart + rows.length - 1;
  if (rows.length) {
    styleDataRange(sheet, dataStart, dataEnd, 9);
    for (let row = dataStart; row <= dataEnd; row += 1) {
      [3, 4, 5].forEach((column) => { sheet.getCell(row, column).numFmt = "#,##0.0"; });
      [6, 7, 8].forEach((column) => { sheet.getCell(row, column).numFmt = "0.00%"; });
      styleChangeCell(sheet.getCell(row, 5), sheet.getCell(row, 5).value);
      styleChangeCell(sheet.getCell(row, 9), sheet.getCell(row, 9).value, '0.00 "pp";[Red]-0.00 "pp";0.00 "pp"');
    }
  } else {
    sheet.mergeCells(`A${dataStart}:I${dataStart}`);
    sheet.getCell(`A${dataStart}`).value = "No losing trading areas for this ranking.";
    sheet.getCell(`A${dataStart}`).font = { name: "Aptos", italic: true, color: { argb: COLORS.slate } };
  }
  return rows.length ? dataEnd : dataStart;
}

function addLosingTradingAreasSheet(workbook, month, activeStations) {
  const sheet = workbook.addWorksheet("Losing Trading Areas", { properties: { tabColor: { argb: "EF4444" } } });
  applySheetDefaults(sheet, [9, 31, 15, 15, 15, 13, 15, 15, 16], 5);
  addSheetHeading(
    sheet,
    "Top Losing Trading Areas",
    `${formatMonth(month)} | IOC | Combined MS + HSD | Top 10 in each ranking`,
    "I"
  );

  const volumeLossRows = buildIOCLossTradingAreaRows(activeStations, {
    fuel: "combined",
    mode: "monthly",
    rankBy: "volume",
  });
  const shareLossRows = buildIOCLossTradingAreaRows(activeStations, {
    fuel: "combined",
    mode: "monthly",
    rankBy: "share",
  });

  const volumeEnd = addLossSection(sheet, 4, "Combined MS + HSD ranked by volume loss", volumeLossRows);
  addLossSection(sheet, volumeEnd + 2, "Combined MS + HSD ranked by market-share loss", shareLossRows);
  return sheet;
}

export async function buildAnalysisWorkbook({ stations = [], month, generatedAt = new Date() }) {
  if (!month) throw new Error("Select a month before downloading the analysis.");
  const activeStations = (stations || []).filter(
    (station) => station.hasMonthData && (!station.month || station.month === month)
  );
  if (!activeStations.length) throw new Error(`No sales data is available for ${formatMonth(month)}.`);

  const excelJsModule = await import("exceljs");
  const ExcelJS = excelJsModule.default || excelJsModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sales Area Analysis";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.subject = `Sales area analysis for ${formatMonth(month)}`;
  workbook.title = `Sales Area Analysis - ${formatMonth(month)}`;
  workbook.company = "IndianOil";
  workbook.calcProperties.fullCalcOnLoad = true;

  const msRows = marketShareRowsAllMonthly_MS(activeStations, "industry");
  const hsdRows = marketShareRowsAllMonthly_HSD(activeStations, "industry");
  addOverviewSheet(workbook, activeStations, month, msRows, hsdRows);
  addMarketShareSheet(workbook, month, msRows, hsdRows);
  addRoSalesSheet(workbook, month, activeStations);
  addLosingTradingAreasSheet(workbook, month, activeStations);

  workbook.eachSheet((sheet) => {
    sheet.headerFooter.oddFooter = `Page &P of &N | ${formatMonth(month)}`;
  });
  return workbook;
}

export async function downloadAnalysisWorkbook(options) {
  const workbook = await buildAnalysisWorkbook(options);
  const buffer = await workbook.xlsx.writeBuffer();
  const monthLabel = formatMonth(options.month).replace(/\s+/g, "_");
  const filename = `Sales_Area_Analysis_${monthLabel}.xlsx`;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
