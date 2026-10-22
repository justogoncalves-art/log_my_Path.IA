// Textos de la experiencia del alumno en un programa. Sin "server-only": los usan
// también los componentes del navegador (reproductor, preguntas, encuesta).

export type ProgramLang = "es" | "en";

const text = {
  es: {
    backHome: "Volver al inicio",
    myPrograms: "Tus programas",
    noPrograms: "Todavía no tenés programas asignados en este módulo.",
    progress: (done: number, total: number) => `${done} de ${total} capítulos`,
    start: "Empezar",
    resume: "Continuar",
    review: "Ver de nuevo",
    chapter: "Capítulo",
    completed: "Completado",
    locked: "Se habilita al terminar el anterior",
    watchFirst: "Mirá el video completo para responder las preguntas.",
    noVideo: "El video de este capítulo todavía no está disponible.",
    writeHere: "Escribí tu respuesta…",
    saveAnswer: "Guardar respuesta",
    saved: "Guardado",
    saveError: "No se pudo guardar. Probá de nuevo.",
    pending: (n: number) => (n === 1 ? "Falta 1 respuesta" : `Faltan ${n} respuestas`),
    nextChapter: "Siguiente capítulo",
    finishProgram: "Terminar programa",
    backToProgram: "Volver al programa",
    programDone: "¡Terminaste el programa! Gracias por tu tiempo.",
    rateTitle: "¿Te ha gustado My Path?",
    rateStars: (n: number) => `${n} de 5 estrellas`,
    improveQ: "¿Qué mejorarías?",
    send: "Enviar",
    later: "Ahora no",
    thanks: "¡Gracias por tu opinión!",
  },
  en: {
    backHome: "Back to home",
    myPrograms: "Your programs",
    noPrograms: "You don't have any programs assigned in this module yet.",
    progress: (done: number, total: number) => `${done} of ${total} chapters`,
    start: "Start",
    resume: "Continue",
    review: "Review",
    chapter: "Chapter",
    completed: "Completed",
    locked: "Unlocks when you finish the previous one",
    watchFirst: "Watch the whole video to answer the questions.",
    noVideo: "This chapter's video isn't available yet.",
    writeHere: "Write your answer…",
    saveAnswer: "Save answer",
    saved: "Saved",
    saveError: "Couldn't save. Please try again.",
    pending: (n: number) => (n === 1 ? "1 answer left" : `${n} answers left`),
    nextChapter: "Next chapter",
    finishProgram: "Finish program",
    backToProgram: "Back to the program",
    programDone: "You finished the program! Thanks for your time.",
    rateTitle: "Do you like My Path?",
    rateStars: (n: number) => `${n} out of 5 stars`,
    improveQ: "What would you improve?",
    send: "Send",
    later: "Not now",
    thanks: "Thanks for your feedback!",
  },
};

export function programText(lang: ProgramLang) {
  return text[lang];
}

// Nombre corto del idioma del contenido, para distinguir versiones del mismo programa
const LANGUAGE_LABELS: Record<string, string> = {
  "es-ES": "Español (España)",
  "es-419": "Español latino",
  "es-AR": "Español (Argentina)",
  en: "English",
  pt: "Português",
};

export function languageLabel(code: string) {
  return LANGUAGE_LABELS[code] ?? code;
}
