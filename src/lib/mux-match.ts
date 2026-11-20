// Unión de videos de Mux con capítulos por el nombre del archivo (lo usa el admin en el navegador).

export type MuxAssetInfo = {
  id: string;
  title: string;
  playbackId: string | null;
  signed: boolean;
  status: string;
  duration: number | null;
  createdAt: string;
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]{2,4}$/, "")
    .replace(/[^a-z0-9]+/g, "-");

// Nombre esperado: "<año>-<programa>_<IDIOMA>_cap<n>", ej. 6-tu-manifiesto_ES_cap1
export function matchAsset(assets: MuxAssetInfo[], grade: number, programTitle: string, excelLang: string, position: number) {
  const prefix = `${grade}-${norm(programTitle)}`;
  const lang = excelLang.toLowerCase();
  return assets.find((a) => {
    const t = norm(a.title);
    const m = t.match(/-cap-?0*(\d+)$/);
    return t.startsWith(prefix) && t.includes(`-${lang}-cap`) && m && Number(m[1]) === position;
  });
}
