import "server-only";
import { cookies } from "next/headers";

export type Lang = "es" | "en";

const dict = {
  es: {
    ecosystem: "Ecosistema psicopedagógico",
    welcomeTitle: "Bienvenido al ecosistema",
    welcomeLead: "Claridad, acompañamiento y propósito. Un solo camino que reúne cada herramienta para acompañarte de verdad.",
    email: "Mail",
    password: "Contraseña",
    signIn: "Ingresar",
    signingIn: "Ingresando…",
    badCredentials: "El mail o la contraseña no son correctos.",
    tooMany: "Demasiados intentos. Esperá unos minutos y volvé a intentar.",
    genericError: "No pudimos completar la acción. Intentá de nuevo.",
    changeTitle: "Elegí tu contraseña",
    changeLead: "Es tu primer ingreso. Reemplazá la contraseña que te llegó por mail por una que solo sepas vos.",
    newPassword: "Nueva contraseña",
    confirmPassword: "Repetí la contraseña",
    passwordRule: "Mínimo 10 caracteres, con letras y números.",
    passwordWeak: "La contraseña debe tener al menos 10 caracteres, con letras y números.",
    passwordMismatch: "Las contraseñas no coinciden.",
    passwordSame: "La nueva contraseña tiene que ser distinta de la anterior.",
    save: "Guardar y continuar",
    saving: "Guardando…",
    yourSpace: "Tu espacio · Ecosistema MY PATH.IA",
    hello: "Bienvenido",
    leadStudent: "Este es tu camino. Cada programa te acerca a conocerte mejor y a decidir con claridad.",
    leadStaff: "Acompaña el avance de tu clase desde un solo lugar: sigue a cada alumno, capítulo a capítulo, con datos precisos para guiar mejor.",
    explore: "Explora tu ecosistema",
    spaces: (n: number) => `${n} espacios, un solo camino.`,
    active: "Activo",
    inactive: "Inactivo",
    logout: "Salir",
    noOrg: "Tu cuenta todavía no está asociada a una organización. Escribinos y lo resolvemos.",
    admin: "Panel de administración",
  },
  en: {
    ecosystem: "Psycho-pedagogical ecosystem",
    welcomeTitle: "Welcome to the ecosystem",
    welcomeLead: "Clarity, guidance and purpose. One path that brings every tool together to truly support you.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in…",
    badCredentials: "The email or password is incorrect.",
    tooMany: "Too many attempts. Wait a few minutes and try again.",
    genericError: "We couldn't complete the action. Please try again.",
    changeTitle: "Choose your password",
    changeLead: "This is your first sign-in. Replace the password you received by email with one only you know.",
    newPassword: "New password",
    confirmPassword: "Repeat the password",
    passwordRule: "At least 10 characters, with letters and numbers.",
    passwordWeak: "The password must be at least 10 characters long, with letters and numbers.",
    passwordMismatch: "The passwords don't match.",
    passwordSame: "The new password must be different from the previous one.",
    save: "Save and continue",
    saving: "Saving…",
    yourSpace: "Your space · MY PATH.IA ecosystem",
    hello: "Welcome",
    leadStudent: "This is your path. Every program brings you closer to knowing yourself and deciding clearly.",
    leadStaff: "Follow your class's progress in one place: track each student, chapter by chapter, with precise data to guide better.",
    explore: "Explore your ecosystem",
    spaces: (n: number) => `${n} spaces, one path.`,
    active: "Active",
    inactive: "Inactive",
    logout: "Sign out",
    noOrg: "Your account isn't linked to an organization yet. Contact us and we'll sort it out.",
    admin: "Admin panel",
  },
};

export type Dict = (typeof dict)["es"];

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get("lang")?.value;
  return value === "en" ? "en" : "es";
}

export async function getDict(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: dict[lang] };
}
