import { z } from "zod";

// Fila de alta tal como la recibe admin_import_people. La comparten la web y el servidor.

export const importRowSchema = z.object({
  doc_country: z.string().max(60).optional(),
  doc_type: z.string().max(20).optional(),
  doc_number: z.string().max(30),
  first_name: z.string().max(100),
  last_name: z.string().max(100),
  email: z.string().max(254),
  role: z.string().max(20),
  class: z.string().max(200).optional(),
  sex: z.string().max(20).optional(),
  birth_date: z.string().max(10).optional(),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  guardian_consent: z.boolean().optional(),
});
export const importRowsSchema = z.array(importRowSchema).min(1).max(2000);
export type ImportRow = z.infer<typeof importRowSchema>;

export type ImportResult = { row_no: number; status: "nuevo" | "existe" | "aviso" | "error"; detail: string };

const COUNTRIES: Record<string, string> = {
  argentina: "AR", uruguay: "UY", paraguay: "PY", chile: "CL", bolivia: "BO", peru: "PE", "perú": "PE",
  ecuador: "EC", colombia: "CO", venezuela: "VE", mexico: "MX", "méxico": "MX", brasil: "BR", brazil: "BR",
  "costa rica": "CR", panama: "PA", "panamá": "PA", guatemala: "GT", honduras: "HN", "el salvador": "SV",
  nicaragua: "NI", "república dominicana": "DO", "republica dominicana": "DO", cuba: "CU", "puerto rico": "PR",
  "españa": "ES", espana: "ES", spain: "ES", portugal: "PT", "estados unidos": "US", usa: "US",
};

export function countryCode(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return COUNTRIES[v.toLowerCase()] ?? v;
}

function normalizeSex(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  if (["hombre", "masculino", "varón", "varon", "m"].includes(v)) return "hombre";
  if (["mujer", "femenino", "f"].includes(v)) return "mujer";
  if (v === "otro") return "otro";
  if (v.startsWith("prefiero") || v === "no informa") return "no_informa";
  return v;
}

function normalizeDate(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^\d+(\.\d+)?$/.test(v)) {
    // Número de serie de Excel (días desde 1899-12-30)
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const dmy = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return v.slice(0, 10);
}

function normalizeConsent(value: string): boolean {
  return ["si", "sí", "yes", "true", "1", "x"].includes(value.trim().toLowerCase());
}

const HEADERS: Record<string, keyof ImportRow | "country"> = {
  dni: "doc_number", documento: "doc_number", "número de documento": "doc_number", "numero de documento": "doc_number",
  "tipo de documento": "doc_type", "país del documento": "doc_country", "pais del documento": "doc_country",
  nombre: "first_name", apellido: "last_name", mail: "email", email: "email", correo: "email",
  tipo: "role", rol: "role", clase: "class", curso: "class", sexo: "sex",
  "fecha de nacimiento": "birth_date", pais: "country", "país": "country", provincia: "province", ciudad: "city",
  consentimiento: "guardian_consent", "consentimiento del tutor": "guardian_consent",
};

// Busca la fila de encabezados (la plantilla tiene un bloque de instrucciones arriba)
export function parseImportRows(sheet: string[][]): { rows: ImportRow[]; missing: string[] } {
  const headerIdx = sheet.findIndex((r) => {
    const keys = r.map((c) => HEADERS[c.trim().toLowerCase()]);
    return keys.includes("doc_number") && keys.includes("email");
  });
  if (headerIdx < 0) return { rows: [], missing: ["Dni", "Mail"] };

  const map = sheet[headerIdx].map((c) => HEADERS[c.trim().toLowerCase()]);
  const required = ["doc_number", "first_name", "last_name", "email", "role", "class"] as const;
  const missing = required.filter((k) => !map.includes(k));

  const rows: ImportRow[] = [];
  for (const raw of sheet.slice(headerIdx + 1)) {
    if (raw.every((c) => !c?.trim())) continue;
    const get = (k: string) => {
      const i = map.indexOf(k as never);
      return i >= 0 ? (raw[i] ?? "").trim() : "";
    };
    const country = countryCode(get("country"));
    rows.push({
      doc_country: countryCode(get("doc_country")) || country || undefined,
      doc_type: get("doc_type").toLowerCase() || undefined,
      doc_number: get("doc_number"),
      first_name: get("first_name"),
      last_name: get("last_name"),
      email: get("email").toLowerCase(),
      role: get("role").toLowerCase(),
      class: get("class"),
      sex: normalizeSex(get("sex")) || undefined,
      birth_date: normalizeDate(get("birth_date")) || undefined,
      province: get("province") || undefined,
      city: get("city") || undefined,
      guardian_consent: normalizeConsent(get("guardian_consent")),
    });
  }
  return { rows, missing: missing.map(String) };
}
