import "server-only";
import { randomInt } from "node:crypto";

// Contraseña inicial: 10 caracteres sin los que se confunden (0/O, 1/l/I), con letras y números.
const LETTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const ALL = LETTERS + DIGITS;

export function generatePassword(length = 10): string {
  for (;;) {
    let out = "";
    for (let i = 0; i < length; i++) out += ALL[randomInt(ALL.length)];
    if (/[A-Za-z]/.test(out) && /[0-9]/.test(out)) return out;
  }
}
