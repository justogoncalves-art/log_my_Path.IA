// Lectura del Excel de un programa (formato Mento.IA, 55 columnas):
// IDIOMA · POSICIÓN · PROGRAMA · TIPO DE PREGUNTA · EVALUACIÓN · CAPÍTULO · PREGUNTA · RESPUESTAS · ID Video · 46 dimensiones.
// Cada fila es una respuesta posible; las preguntas abiertas vienen en una fila sin respuesta.

export type ImportOption = { position: number; text: string; weights: Record<string, number> };
export type ImportQuestion = { position: number; kind: "simple" | "abierta"; prompt: string; options: ImportOption[] };
export type ImportChapter = { position: number; title: string; assessment: string; video: string; questions: ImportQuestion[] };
export type ParsedProgram = {
  language: string | null;
  languageRaw: string;
  programName: string;
  chapters: ImportChapter[];
  warnings: string[];
  errors: string[];
};

// Código del Excel → idioma de la plataforma
export const EXCEL_LANGUAGES: Record<string, string> = {
  AR: "es-AR",
  ES: "es-ES",
  LAT: "es-419",
  EN: "en",
  PT: "pt",
  BR: "pt",
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function parseProgramSheet(sheet: string[][], dimensionsByLabel: Record<string, string>): ParsedProgram {
  const out: ParsedProgram = { language: null, languageRaw: "", programName: "", chapters: [], warnings: [], errors: [] };
  const headerIdx = sheet.findIndex((r) => r.some((c) => norm(c ?? "") === "idioma") && r.some((c) => norm(c ?? "") === "pregunta"));
  if (headerIdx < 0) {
    out.errors.push("No encontramos la fila de encabezados (IDIOMA, POSICIÓN, PROGRAMA, …)");
    return out;
  }
  const header = sheet[headerIdx].map((c) => (c ?? "").trim());
  const col = (name: string) => header.findIndex((h) => norm(h) === norm(name));
  const c = {
    lang: col("IDIOMA"),
    pos: col("POSICIÓN"),
    prog: col("PROGRAMA"),
    kind: col("TIPO DE PREGUNTA"),
    evalName: col("EVALUACIÓN"),
    chapter: col("CAPÍTULO"),
    question: col("PREGUNTA"),
    answer: col("RESPUESTAS"),
    video: col("ID Video"),
  };
  for (const [k, i] of Object.entries(c)) if (i < 0) out.errors.push(`Falta la columna ${k}`);
  if (out.errors.length) return out;

  // Columnas de dimensiones: todas las que están después de "ID Video"
  const dimCols: Array<{ idx: number; id: string }> = [];
  for (let i = c.video + 1; i < header.length; i++) {
    if (!header[i]) continue;
    const id = dimensionsByLabel[header[i]];
    if (id) dimCols.push({ idx: i, id });
    else out.errors.push(`Columna de ponderación desconocida: "${header[i]}"`);
  }

  const chapters = new Map<number, ImportChapter>();
  const languages = new Set<string>();
  const programs = new Set<string>();

  for (const raw of sheet.slice(headerIdx + 1)) {
    const get = (i: number) => (raw[i] ?? "").trim();
    if (!get(c.question) && !get(c.answer)) continue;
    const pos = Number(get(c.pos));
    if (!Number.isFinite(pos) || pos <= 0) {
      out.errors.push(`Fila con POSICIÓN inválida: "${get(c.pos)}"`);
      continue;
    }
    languages.add(get(c.lang).toUpperCase());
    programs.add(get(c.prog));

    let ch = chapters.get(pos);
    if (!ch) {
      ch = { position: pos, title: get(c.chapter), assessment: get(c.evalName), video: get(c.video), questions: [] };
      chapters.set(pos, ch);
    }
    if (!ch.video && get(c.video)) ch.video = get(c.video);

    const prompt = get(c.question);
    let q = ch.questions.find((x) => x.prompt === prompt);
    if (!q) {
      q = { position: ch.questions.length + 1, kind: norm(get(c.kind)).startsWith("abierta") ? "abierta" : "simple", prompt, options: [] };
      ch.questions.push(q);
    }
    const answer = get(c.answer);
    if (answer && q.kind === "simple") {
      const weights: Record<string, number> = {};
      for (const d of dimCols) {
        const v = Number(get(d.idx).replace(",", "."));
        if (Number.isFinite(v) && v > 0) weights[d.id] = v;
      }
      q.options.push({ position: q.options.length + 1, text: answer, weights });
    }
  }

  out.chapters = [...chapters.values()].sort((a, b) => a.position - b.position);
  out.programName = [...programs].join(" / ");
  out.languageRaw = [...languages].join(", ");
  if (languages.size !== 1) out.errors.push(`El archivo tiene que ser de un solo idioma (encontramos: ${out.languageRaw || "ninguno"})`);
  else out.language = EXCEL_LANGUAGES[out.languageRaw] ?? null;
  if (languages.size === 1 && !out.language) out.errors.push(`Idioma desconocido: ${out.languageRaw}`);

  for (const ch of out.chapters) {
    if (!ch.video) out.warnings.push(`Capítulo ${ch.position} "${ch.title}": sin ID de video`);
    for (const q of ch.questions) {
      if (q.kind === "simple" && q.options.length === 0) {
        q.kind = "abierta";
        out.warnings.push(`Capítulo ${ch.position}: "${q.prompt.slice(0, 50)}…" figura como Simple pero no tiene respuestas; la cargamos como Abierta`);
      } else if (q.kind === "simple" && q.options.length === 1) {
        out.warnings.push(`Capítulo ${ch.position}: "${q.prompt.slice(0, 50)}…" tiene una sola respuesta`);
      }
      for (const o of q.options) {
        const sum = Object.values(o.weights).reduce((a, b) => a + b, 0);
        if (sum !== 0 && Math.round(sum) !== 100) {
          out.warnings.push(`Capítulo ${ch.position}, pregunta ${q.position}, respuesta ${o.position}: las ponderaciones suman ${sum}, no 100`);
        }
      }
    }
  }
  return out;
}
