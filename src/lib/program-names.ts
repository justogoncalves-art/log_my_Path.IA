// Nombre del programa para el admin: título + código de idioma del Excel (Tu Manifiesto AR, ES, LAT, EN, PT).
const CODES: Record<string, string> = { "es-AR": "AR", "es-ES": "ES", "es-419": "LAT", en: "EN", pt: "PT" };

export const languageCode = (language: string) => CODES[language] ?? language.toUpperCase();
export const programName = (title: string, language: string) => `${title} ${languageCode(language)}`;
