import "server-only";
import { staffClasses } from "@/lib/staff";

// Clase elegida por ?clase (o la primera con alumnos)
export async function pickClass(requested: string | undefined) {
  const classes = await staffClasses();
  const klass = classes.find((c) => c.class_id === requested) ?? classes.find((c) => c.students > 0) ?? classes[0] ?? null;
  return { classes, klass };
}
