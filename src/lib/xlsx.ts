import { unzipSync, strFromU8 } from "fflate";

// Lector mínimo de .xlsx en el navegador: devuelve la primera hoja como filas de texto.
// Las fechas llegan como número de serie de Excel; parseImportRows las convierte.

const MAX_BYTES = 5 * 1024 * 1024;

function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readFirstSheet(file: File, maxBytes = MAX_BYTES): Promise<string[][]> {
  if (file.size > maxBytes) throw new Error(`El archivo supera ${Math.round(maxBytes / 1024 / 1024)} MB`);
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (f) => f.name === "xl/sharedStrings.xml" || f.name === "xl/workbook.xml" || f.name.startsWith("xl/worksheets/sheet"),
  });
  const sheetName = Object.keys(zip)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error("No encontramos hojas en el archivo");

  const parser = new DOMParser();
  const shared: string[] = [];
  if (zip["xl/sharedStrings.xml"]) {
    const doc = parser.parseFromString(strFromU8(zip["xl/sharedStrings.xml"]), "application/xml");
    for (const si of Array.from(doc.getElementsByTagName("si"))) {
      shared.push(Array.from(si.getElementsByTagName("t")).map((t) => t.textContent ?? "").join(""));
    }
  }

  const sheet = parser.parseFromString(strFromU8(zip[sheetName]), "application/xml");
  const rows: string[][] = [];
  for (const row of Array.from(sheet.getElementsByTagName("row"))) {
    const cells: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const idx = colIndex(c.getAttribute("r") ?? "A1");
      const type = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      let value = v;
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = c.getElementsByTagName("t")[0]?.textContent ?? "";
      cells[idx] = value.trim();
    }
    rows.push(Array.from(cells, (x) => x ?? ""));
  }
  return rows;
}
