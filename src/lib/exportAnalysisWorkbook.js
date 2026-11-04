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
  ioclBlue: "0057A8",
  ioclFill: "FFF2DB",
  ioclBorder: "F58220",
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
  applySheetDefaults(sheet, [16, 11, 13, 13, 13, 13, 14, 14, 14, 12], 7);
  addSheetHeading(
    sheet,
    "Sales Area Analysis",
    `${formatMonth(month)} | Industry scope | All classes of market`,
    "J"
  );

  const contextItems = [
    ["A4", "Selected month", COLORS.paleBlue],
    ["B4", formatMonth(month), COLORS.white],
    ["C4", "Scope", COLORS.paleBlue],
    ["D4", "Industry", COLORS.white],
    ["E4", "RO count", COLORS.paleBlue],
    ["F4", activeStations.length, COLORS.white],
  ];
  contextItems.forEach(([address, value, fill]) => {
    const cell = sheet.getCell(address);
    cell.value = value;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.font = {
      name: "Aptos",
      size: 10,
      bold: address === "A4" || address === "C4" || address === "E4",
      color: { argb: COLORS.navy },
    };
    cell.alignment = { vertical: "middle", horizontal: address === "F4" ? "right" : "left" };
    cell.border = thinBorder;
  });
  sheet.getCell("F4").numFmt = "#,##0";
  sheet.getRow(4).height = 24;

  addSectionLabel(sheet, 6, "Company performance", "J");
  const header = sheet.getRow(7);
  header.values = [
    "Company",
    "RO Count",
    "MS CY",
    "MS Share CY",
    "HSD CY",
    "HSD Share CY",
    "Combined CY",
    "Combined LY",
    "Combined Change",
    "Combined Growth %",
  ];
  styleHeaderRow(header);

  const msByCompany = new Map(msRows.map((row) => [row.company, row]));
  const hsdByCompany = new Map(hsdRows.map((row) => [row.company, row]));
  const roCountByCompany = activeStations.reduce((counts, station) => {
    const company = (station.company || "").toString().trim().toUpperCase();
    if (company) counts.set(company, (counts.get(company) || 0) + 1);
    return counts;
  }, new Map());
  const companyNames = Array.from(new Set([
    ...msRows.filter((row) => !row.isTotal).map((row) => row.company),
    ...hsdRows.filter((row) => !row.isTotal).map((row) => row.company),
  ])).sort((a, b) => {
    const aCombined = Number(msByCompany.get(a)?.curr || 0) + Number(hsdByCompany.get(a)?.curr || 0);
    const bCombined = Number(msByCompany.get(b)?.curr || 0) + Number(hsdByCompany.get(b)?.curr || 0);
    return bCombined - aCombined || a.localeCompare(b);
  });
  companyNames.push("Total");

  companyNames.forEach((company) => {
    const ms = msByCompany.get(company) || {};
    const hsd = hsdByCompany.get(company) || {};
    const combinedCurr = Number(ms.curr || 0) + Number(hsd.curr || 0);
    const combinedLast = Number(ms.last || 0) + Number(hsd.last || 0);
    sheet.addRow([
      company === "IOC" ? "IOCL" : company === "Total" ? "Industry Total" : company,
      company === "Total" ? activeStations.length : Number(roCountByCompany.get(company) || 0),
      Number(ms.curr || 0),
      Number(ms.share || 0) / 100,
      Number(hsd.curr || 0),
      Number(hsd.share || 0) / 100,
      combinedCurr,
      combinedLast,
      combinedCurr - combinedLast,
      calcGrowth(combinedCurr, combinedLast) / 100,
    ]);
  });

  const firstDataRow = 8;
  const lastDataRow = firstDataRow + companyNames.length - 1;
  styleDataRange(sheet, firstDataRow, lastDataRow, 10);
  for (let row = firstDataRow; row <= lastDataRow; row += 1) {
    sheet.getCell(row, 2).numFmt = "#,##0";
    [3, 5, 7, 8, 9].forEach((column) => { sheet.getCell(row, column).numFmt = "#,##0.0"; });
    [4, 6, 10].forEach((column) => { sheet.getCell(row, column).numFmt = "0.00%"; });
    styleChangeCell(sheet.getCell(row, 9), sheet.getCell(row, 9).value);

    const sourceCompany = companyNames[row - firstDataRow];
    if (sourceCompany === "IOC") {
      const ioclRow = sheet.getRow(row);
      ioclRow.eachCell((cell, column) => {
        if (column !== 9) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ioclFill } };
        }
        cell.font = {
          ...cell.font,
          bold: true,
          color: { argb: column === 1 ? COLORS.white : COLORS.ioclBlue },
        };
        cell.border = {
          top: { style: "medium", color: { argb: COLORS.ioclBorder } },
          bottom: { style: "medium", color: { argb: COLORS.ioclBorder } },
          left: cell.border?.left || thinBorder.left,
          right: cell.border?.right || thinBorder.right,
        };
      });
      sheet.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ioclBlue } };
    }
  }

  const totalRow = sheet.getRow(lastDataRow);
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
    cell.font = { ...cell.font, bold: true, color: { argb: COLORS.navy } };
  });
  sheet.autoFilter = { from: "A7", to: `J${lastDataRow}` };
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
  return { sheet, volumeLossRows, shareLossRows };
}

function normalizeTradingArea(value) {
  return (value || "").toString().trim().toLowerCase();
}

function styleTradingAreaCompanyRows(sheet, firstRow, companyNames) {
  const lastRow = firstRow + companyNames.length - 1;
  styleDataRange(sheet, firstRow, lastRow, 12);
  for (let row = firstRow; row <= lastRow; row += 1) {
    sheet.getCell(row, 2).numFmt = "#,##0";
    [3, 4, 6, 7, 9, 10, 11].forEach((column) => { sheet.getCell(row, column).numFmt = "#,##0.0"; });
    [5, 8, 12].forEach((column) => { sheet.getCell(row, column).numFmt = "0.00%"; });
    styleChangeCell(sheet.getCell(row, 11), sheet.getCell(row, 11).value);

    const company = companyNames[row - firstRow];
    if (company === "IOC") {
      const ioclRow = sheet.getRow(row);
      ioclRow.eachCell((cell, column) => {
        if (column !== 11) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ioclFill } };
        }
        cell.font = {
          ...cell.font,
          bold: true,
          color: { argb: column === 1 ? COLORS.white : COLORS.ioclBlue },
        };
      });
      sheet.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.ioclBlue } };
    }
  }

  const totalRow = sheet.getRow(lastRow);
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
    cell.font = { ...cell.font, bold: true, color: { argb: COLORS.navy } };
  });
  return lastRow;
}

function addTradingAreaAnalysisSheet(workbook, month, activeStations, lossRows) {
  const sheet = workbook.addWorksheet("Trading Area Analysis", { properties: { tabColor: { argb: "F59E0B" } } });
  applySheetDefaults(sheet, [28, 12, 12, 12, 13, 12, 12, 13, 14, 14, 14, 13], 3);
  addSheetHeading(
    sheet,
    "Trading Area Analysis",
    `${formatMonth(month)} | Detailed company and RO analysis for top losing trading areas`,
    "L"
  );
  sheet.mergeCells("A4:L4");
  sheet.getCell("A4").value = "Click a trading area on the Losing Trading Areas sheet to jump directly to its analysis below.";
  sheet.getCell("A4").font = { name: "Aptos", size: 10, italic: true, color: { argb: COLORS.slate } };
  sheet.getCell("A4").alignment = { vertical: "middle" };

  const areaNames = [];
  const seenAreas = new Set();
  lossRows.forEach((row) => {
    const key = normalizeTradingArea(row.area);
    if (!key || seenAreas.has(key)) return;
    seenAreas.add(key);
    areaNames.push(row.area);
  });

  const anchorByArea = new Map();
  let currentRow = 6;
  areaNames.forEach((areaName) => {
    const areaKey = normalizeTradingArea(areaName);
    const areaStations = activeStations
      .filter((station) => normalizeTradingArea(station.trading_area_norm || station.trading_area) === areaKey)
      .sort((a, b) =>
        (a.company || "").localeCompare(b.company || "") ||
        (a.name || "").localeCompare(b.name || "")
      );
    if (!areaStations.length) return;

    anchorByArea.set(areaKey, currentRow);
    sheet.mergeCells(`A${currentRow}:J${currentRow}`);
    const areaTitleCell = sheet.getCell(currentRow, 1);
    areaTitleCell.value = areaName;
    areaTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
    areaTitleCell.font = { name: "Aptos Display", size: 14, bold: true, color: { argb: COLORS.white } };
    areaTitleCell.alignment = { vertical: "middle" };
    areaTitleCell.border = thinBorder;
    sheet.mergeCells(`K${currentRow}:L${currentRow}`);
    const backCell = sheet.getCell(currentRow, 11);
    backCell.value = { text: "Back to loss rankings", hyperlink: "#'Losing Trading Areas'!A1" };
    backCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paleBlue } };
    backCell.font = { name: "Aptos", size: 10, bold: true, underline: true, color: { argb: COLORS.ioclBlue } };
    backCell.alignment = { vertical: "middle", horizontal: "center" };
    backCell.border = thinBorder;
    sheet.getRow(currentRow).height = 28;

    const companyHeaderRow = sheet.getRow(currentRow + 1);
    companyHeaderRow.values = [
      "Company",
      "RO Count",
      "MS CY",
      "MS LY",
      "MS Share CY",
      "HSD CY",
      "HSD LY",
      "HSD Share CY",
      "Combined CY",
      "Combined LY",
      "Combined Change",
      "Combined Growth %",
    ];
    styleHeaderRow(companyHeaderRow);

    const msRows = marketShareRowsAllMonthly_MS(areaStations, "industry");
    const hsdRows = marketShareRowsAllMonthly_HSD(areaStations, "industry");
    const msByCompany = new Map(msRows.map((row) => [row.company, row]));
    const hsdByCompany = new Map(hsdRows.map((row) => [row.company, row]));
    const roCountByCompany = areaStations.reduce((counts, station) => {
      const company = (station.company || "").toString().trim().toUpperCase();
      if (company) counts.set(company, (counts.get(company) || 0) + 1);
      return counts;
    }, new Map());
    const companyNames = Array.from(new Set([
      ...msRows.filter((row) => !row.isTotal).map((row) => row.company),
      ...hsdRows.filter((row) => !row.isTotal).map((row) => row.company),
    ])).sort((a, b) => {
      const aCombined = Number(msByCompany.get(a)?.curr || 0) + Number(hsdByCompany.get(a)?.curr || 0);
      const bCombined = Number(msByCompany.get(b)?.curr || 0) + Number(hsdByCompany.get(b)?.curr || 0);
      return bCombined - aCombined || a.localeCompare(b);
    });
    companyNames.push("Total");

    companyNames.forEach((company) => {
      const ms = msByCompany.get(company) || {};
      const hsd = hsdByCompany.get(company) || {};
      const combinedCurr = Number(ms.curr || 0) + Number(hsd.curr || 0);
      const combinedLast = Number(ms.last || 0) + Number(hsd.last || 0);
      sheet.addRow([
        company === "IOC" ? "IOCL" : company === "Total" ? "Trading Area Total" : company,
        company === "Total" ? areaStations.length : Number(roCountByCompany.get(company) || 0),
        Number(ms.curr || 0),
        Number(ms.last || 0),
        Number(ms.share || 0) / 100,
        Number(hsd.curr || 0),
        Number(hsd.last || 0),
        Number(hsd.share || 0) / 100,
        combinedCurr,
        combinedLast,
        combinedCurr - combinedLast,
        calcGrowth(combinedCurr, combinedLast) / 100,
      ]);
    });
    const companyFirstRow = currentRow + 2;
    const companyLastRow = styleTradingAreaCompanyRows(sheet, companyFirstRow, companyNames);

    const roSectionRow = companyLastRow + 2;
    addSectionLabel(sheet, roSectionRow, `RO-wise sales | ${areaStations.length} outlets`, "L");
    const roHeaderRow = sheet.getRow(roSectionRow + 1);
    roHeaderRow.values = [
      "RO Name",
      "Company",
      "Class",
      "MS CY",
      "MS LY",
      "MS Change",
      "HSD CY",
      "HSD LY",
      "HSD Change",
      "Combined CY",
      "Combined LY",
      "Combined Change",
    ];
    styleHeaderRow(roHeaderRow);

    areaStations.forEach((station) => {
      const msCy = Number(station.ms || 0);
      const msLy = Number(station.ms_ly || 0);
      const hsdCy = Number(station.hsd || 0);
      const hsdLy = Number(station.hsd_ly || 0);
      sheet.addRow([
        station.name || "",
        station.company === "IOC" ? "IOCL" : station.company || "",
        station.class_of_market || "",
        msCy,
        msLy,
        msCy - msLy,
        hsdCy,
        hsdLy,
        hsdCy - hsdLy,
        msCy + hsdCy,
        msLy + hsdLy,
        (msCy + hsdCy) - (msLy + hsdLy),
      ]);
    });

    const roFirstRow = roSectionRow + 2;
    const roLastRow = roFirstRow + areaStations.length - 1;
    styleDataRange(sheet, roFirstRow, roLastRow, 12);
    for (let row = roFirstRow; row <= roLastRow; row += 1) {
      [1, 2, 3].forEach((column) => { sheet.getCell(row, column).alignment = { vertical: "middle", horizontal: "left" }; });
      for (let column = 4; column <= 12; column += 1) sheet.getCell(row, column).numFmt = "#,##0.0";
      [6, 9, 12].forEach((column) => styleChangeCell(sheet.getCell(row, column), sheet.getCell(row, column).value));
    }
    currentRow = roLastRow + 3;
  });

  return { sheet, anchorByArea };
}

function addTradingAreaLinks(losingSheet, anchorByArea) {
  for (let row = 1; row <= losingSheet.rowCount; row += 1) {
    const cell = losingSheet.getCell(row, 2);
    if (typeof cell.value !== "string") continue;
    const anchorRow = anchorByArea.get(normalizeTradingArea(cell.value));
    if (!anchorRow) continue;
    const label = cell.value;
    cell.value = { text: label, hyperlink: `#'Trading Area Analysis'!A${anchorRow}` };
    cell.font = { ...cell.font, bold: true, underline: true, color: { argb: COLORS.ioclBlue } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  }
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
  const losingAreas = addLosingTradingAreasSheet(workbook, month, activeStations);
  const tradingAreaAnalysis = addTradingAreaAnalysisSheet(
    workbook,
    month,
    activeStations,
    [...losingAreas.volumeLossRows, ...losingAreas.shareLossRows]
  );
  addTradingAreaLinks(losingAreas.sheet, tradingAreaAnalysis.anchorByArea);

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
