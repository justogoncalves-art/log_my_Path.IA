// Lectura del Excel de Campus (43 columnas, una fila por carrera con los datos de la universidad repetidos).
// Corre en el navegador del admin: valida, normaliza y arma tandas para subir. Seguro para el cliente.

export const CAMPUS_HEADERS = [
  "NOMBRE_OFICIAL", "NOMBRE_CORTO", "PAÍS", "REGIÓN / ESTADO", "CIUDAD", "TIPO", "IDIOMA_INSTRUCCIÓN",
  "RANKING_QS_2025", "RANKING_THE_2025", "RANKING_ARWU_2024", "RANKING_NACIONAL", "ACREDITACIONES", "Nº_ALUMNOS",
  "AÑO_FUNDACIÓN", "WEB_OFICIAL", "DESCRIPCIÓN_ES", "DESCRIPCIÓN_EN", "FUENTE_DATOS", "FECHA_ACTUALIZACIÓN",
  "NOTAS_INTERNAS", "TIPO_INSTITUCIÓN", "NOMBRE_PROGRAMA", "NOMBRE_EN", "TIPO_PROGRAMA", "ÁREA_CONOCIMIENTO",
  "FAMILIA_PROFESIONAL", "RIASEC_PRIMARIO", "RIASEC_SECUNDARIO", "DURACIÓN_AÑOS", "MODALIDAD", "IDIOMA",
  "COSTE_ANUAL_EUR", "BECAS_DISPONIBLES", "NOTA_ACCESO", "NOTA_CORTE_TIPO", "NOTA_CORTE_FUENTE", "TASA_EMPLEO_2A",
  "SALARIO_MEDIO_EUR", "URL_FICHA", "DESCRIPCIÓN_ES", "CURRÍCULUM", "FUENTE", "FECHA_ACT",
] as const;

// Nombre del país (en el idioma que venga) → código ISO. Se suman países sin tocar la base.
const COUNTRIES: Record<string, string> = {
  argentina: "AR", espana: "ES", spain: "ES", chile: "CL", mexico: "MX", colombia: "CO", peru: "PE", uruguay: "UY",
  paraguay: "PY", bolivia: "BO", ecuador: "EC", venezuela: "VE", "costa rica": "CR", panama: "PA", guatemala: "GT",
  honduras: "HN", "el salvador": "SV", nicaragua: "NI", "republica dominicana": "DO", "puerto rico": "PR", cuba: "CU",
  brasil: "BR", brazil: "BR", portugal: "PT", "reino unido": "GB", "united kingdom": "GB", uk: "GB",
  "estados unidos": "US", "united states": "US", usa: "US", "ee.uu.": "US", canada: "CA", francia: "FR", france: "FR",
  alemania: "DE", germany: "DE", italia: "IT", italy: "IT", "paises bajos": "NL", holanda: "NL", netherlands: "NL",
  suiza: "CH", switzerland: "CH", australia: "AU", irlanda: "IE", ireland: "IE", belgica: "BE", belgium: "BE",
  austria: "AT", suecia: "SE", sweden: "SE", dinamarca: "DK", denmark: "DK", qatar: "QA", catar: "QA",
  "emiratos arabes unidos": "AE", "united arab emirates": "AE", "arabia saudita": "SA", "saudi arabia": "SA",
  japon: "JP", japan: "JP", "nueva zelanda": "NZ", "new zealand": "NZ", china: "CN", "corea del sur": "KR", singapur: "SG",
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
export const countryCode = (name: string) => COUNTRIES[plain(name)] ?? null;

const EMPTY = new Set(["", "-", "—", "–", "n/a", "na", "none", "null"]);
const txt = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return EMPTY.has(s.toLowerCase()) ? null : s;
};
const int = (v: string | undefined) => {
  const s = txt(v);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && Math.abs(n) < 1e7 ? Math.round(n) : null;
};
const num = (v: string | undefined) => {
  const s = txt(v);
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n * 10) / 10 : null;
};
const riasec = (v: string | undefined) => {
  const s = (txt(v) ?? "").toUpperCase();
  return /^[RIASEC]$/.test(s) ? s : null;
};
const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
// Excel guarda fechas como número de serie
const dateText = (v: string | undefined) => {
  const s = txt(v);
  if (s && /^\d{5}(\.\d+)?$/.test(s)) return new Date(Math.round((Number(s) - 25569) * 86400000)).toISOString().slice(0, 10);
  return s;
};
// Links de relleno del tipo https://www.ar-001.edu.ar/...: no se muestran al alumno
const PLACEHOLDER_URL = /^https?:\/\/(www\.)?[a-z]{2}-\d{3}\./i;
const url = (v: string | undefined) => {
  const s = txt(v);
  if (!s || !/^https?:\/\//i.test(s) || PLACEHOLDER_URL.test(s)) return null;
  return s;
};

export type CampusUniversity = {
  country_code: string; official_name: string; short_name: string | null; region: string | null; city: string | null;
  ownership: string | null; institution_type: string | null; instruction_language: string | null;
  rank_qs: number | null; rank_the: number | null; rank_arwu: number | null; rank_national: number | null;
  accreditations: string | null; students: string | null; founded: number | null; website: string | null;
  description_es: string | null; description_en: string | null; data_source: string | null; data_updated: string | null;
  notes: string | null;
};
export type CampusProgram = {
  country_code: string; university: string; name: string; program_type: string | null; modality: string | null;
  name_en: string | null; knowledge_area: string | null; professional_family: string | null;
  riasec_primary: string | null; riasec_secondary: string | null; duration_years: number | null; language: string | null;
  annual_cost: string | null; scholarships: string | null; admission: string | null; cutoff_type: string | null;
  cutoff_source: string | null; employment_rate: string | null; avg_salary: string | null; url: string | null;
  description: string | null; curriculum: string | null; source: string | null; data_updated: string | null;
};

export type CampusParse = {
  universities: CampusUniversity[];
  programs: CampusProgram[];
  countries: { code: string; name: string; universities: number; programs: number }[];
  errors: string[];        // impiden subir
  warnings: string[];      // se sube igual
};

export function parseCampusSheet(rows: string[][]): CampusParse {
  const errors: string[] = [];
  const warnings: string[] = [];
  const headerRow = rows.findIndex((r) => (r[0] ?? "").trim().toUpperCase() === "NOMBRE_OFICIAL");
  if (headerRow < 0) return { universities: [], programs: [], countries: [], errors: ["No encontramos la fila de títulos (NOMBRE_OFICIAL…)"], warnings };
  const header = rows[headerRow].map((h) => (h ?? "").trim().toUpperCase());
  const diffs = CAMPUS_HEADERS.map((h, i) => (header[i] === h ? null : `columna ${i + 1}: se esperaba "${h}" y llegó "${header[i] ?? ""}"`)).filter(Boolean);
  if (diffs.length) return { universities: [], programs: [], countries: [], errors: ["La estructura no coincide con la plantilla de Campus", ...diffs.slice(0, 8)] as string[], warnings };

  const unis = new Map<string, CampusUniversity>();
  const uniVersions = new Map<string, Set<string>>();
  const programs = new Map<string, CampusProgram>();
  const unknownCountries = new Map<string, number>();
  let dupPrograms = 0;
  let placeholders = 0;
  let oddDates = 0;
  const badRiasec: number[] = [];

  rows.slice(headerRow + 1).forEach((r, i) => {
    const line = headerRow + i + 2;
    const name = txt(r[0]);
    if (!name && !txt(r[21])) return; // fila vacía
    if (!name) return void errors.push(`Fila ${line}: falta NOMBRE_OFICIAL`);
    const country = txt(r[2]) ?? "";
    const cc = countryCode(country);
    if (!cc) return void unknownCountries.set(country || "(vacío)", (unknownCountries.get(country || "(vacío)") ?? 0) + 1);

    const key = `${cc}|${plain(name)}`;
    const updated = dateText(r[18]);
    if (updated && !isDate(updated)) oddDates++;
    const uni: CampusUniversity = {
      country_code: cc, official_name: name, short_name: txt(r[1]), region: txt(r[3]), city: txt(r[4]), ownership: txt(r[5]),
      institution_type: txt(r[20]), instruction_language: txt(r[6]), rank_qs: int(r[7]), rank_the: int(r[8]),
      rank_arwu: int(r[9]), rank_national: int(r[10]), accreditations: txt(r[11]), students: txt(r[12]),
      founded: int(r[13]), website: url(r[14]), description_es: txt(r[15]), description_en: txt(r[16]),
      data_source: txt(r[17]), data_updated: updated, notes: txt(r[19]),
    };
    unis.set(key, uni); // si la universidad aparece con datos distintos, vale la última fila
    const version = JSON.stringify(uni);
    uniVersions.set(key, (uniVersions.get(key) ?? new Set()).add(version));

    const progName = txt(r[21]);
    if (!progName) return; // universidad sin carreras
    const rp = riasec(r[26]);
    if (txt(r[26]) && !rp) badRiasec.push(line);
    const link = txt(r[38]);
    const cleanUrl = url(r[38]);
    if (link && !cleanUrl) placeholders++;
    const prog: CampusProgram = {
      country_code: cc, university: name, name: progName, program_type: txt(r[23]), modality: txt(r[29]), name_en: txt(r[22]),
      knowledge_area: txt(r[24]), professional_family: txt(r[25]), riasec_primary: rp, riasec_secondary: riasec(r[27]),
      duration_years: num(r[28]), language: txt(r[30]), annual_cost: txt(r[31]), scholarships: txt(r[32]),
      admission: txt(r[33]), cutoff_type: txt(r[34]), cutoff_source: txt(r[35]), employment_rate: txt(r[36]),
      avg_salary: txt(r[37]), url: cleanUrl, description: txt(r[39]), curriculum: txt(r[40]), source: txt(r[41]),
      data_updated: dateText(r[42]),
    };
    const pkey = `${key}|${plain(progName)}|${plain(prog.program_type ?? "")}|${plain(prog.modality ?? "")}`;
    if (programs.has(pkey)) dupPrograms++;
    programs.set(pkey, prog);
  });

  for (const [c, n] of unknownCountries) errors.push(`País no reconocido "${c}" (${n} filas): avisanos para sumarlo`);
  if (badRiasec.length) warnings.push(`${badRiasec.length} carreras con RIASEC_PRIMARIO inválido (se guarda vacío). Filas: ${badRiasec.slice(0, 10).join(", ")}…`);
  const inconsistent = [...uniVersions.values()].filter((v) => v.size > 1).length;
  if (inconsistent) warnings.push(`${inconsistent} universidades aparecen con datos distintos en distintas filas: se guarda la última.`);
  if (dupPrograms) warnings.push(`${dupPrograms} carreras repetidas (misma universidad, nombre, tipo y modalidad): se guarda la última.`);
  if (placeholders) warnings.push(`${placeholders} links de carrera de relleno (tipo ar-001.edu.ar): no se muestran al alumno hasta que tengan el link real.`);
  if (oddDates) warnings.push(`${oddDates} filas con FECHA_ACTUALIZACIÓN que no es una fecha (parece texto corrido de otra columna).`);

  const byCountry = new Map<string, { code: string; name: string; universities: number; programs: number }>();
  for (const u of unis.values()) {
    const c = byCountry.get(u.country_code) ?? { code: u.country_code, name: u.country_code, universities: 0, programs: 0 };
    c.universities++;
    byCountry.set(u.country_code, c);
  }
  for (const p of programs.values()) byCountry.get(p.country_code)!.programs++;

  return {
    universities: [...unis.values()],
    programs: [...programs.values()],
    countries: [...byCountry.values()].sort((a, b) => b.programs - a.programs),
    errors: errors.slice(0, 30),
    warnings,
  };
}

// Tandas de hasta ~700 KB (el servidor acepta 1 MB por pedido). Cada universidad viaja con sus carreras.
export function campusBatches(parse: CampusParse, maxBytes = 700_000) {
  const progsByUni = new Map<string, CampusProgram[]>();
  for (const p of parse.programs) {
    const k = `${p.country_code}|${plain(p.university)}`;
    progsByUni.set(k, [...(progsByUni.get(k) ?? []), p]);
  }
  const batches: { universities: CampusUniversity[]; programs: CampusProgram[] }[] = [];
  let cur = { universities: [] as CampusUniversity[], programs: [] as CampusProgram[] };
  let size = 0;
  for (const u of parse.universities) {
    const progs = progsByUni.get(`${u.country_code}|${plain(u.official_name)}`) ?? [];
    // Una universidad con muchísimas carreras se parte en varias tandas
    for (let i = 0; i < Math.max(progs.length, 1); i += 400) {
      const slice = progs.slice(i, i + 400);
      const bytes = JSON.stringify(u).length + JSON.stringify(slice).length;
      if (size + bytes > maxBytes || cur.programs.length + slice.length > 2500 || cur.universities.length >= 450) {
        if (cur.universities.length) batches.push(cur);
        cur = { universities: [], programs: [] };
        size = 0;
      }
      cur.universities.push(u);
      cur.programs.push(...slice);
      size += bytes;
    }
  }
  if (cur.universities.length) batches.push(cur);
  return batches;
}
