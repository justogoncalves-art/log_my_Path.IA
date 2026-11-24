"use client";

import { useRouter } from "next/navigation";
import { AltaPersonas } from "@/app/admin/alta/alta-personas";

// Alta de personas dentro del asistente: al guardar, actualiza el conteo y habilita "Siguiente"
export function AltaStep({ org }: { org: { id: string; name: string; country: string } }) {
  const router = useRouter();
  return <AltaPersonas orgs={[org]} initialOrg={org.id} lockOrg onSaved={() => router.refresh()} />;
}
