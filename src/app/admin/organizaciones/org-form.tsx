"use client";

import { saveOrg } from "@/app/admin/actions";
import { ActionForm, inputCls, Label } from "@/app/admin/ui";
import type { OrgRow } from "@/lib/admin-data";

export function OrgForm({ resellers, org }: { resellers: Array<{ id: string; name: string }>; org?: OrgRow }) {
  return (
    <ActionForm action={saveOrg} submit={org ? "Guardar cambios" : "Crear organización"} className="mt-4 grid gap-4 md:grid-cols-4">
      {org ? <input type="hidden" name="id" value={org.id} /> : null}
      <Label text="Nombre">
        <input name="name" required defaultValue={org?.name} className={inputCls} />
      </Label>
      <Label text="Tipo">
        <select name="kind" defaultValue={org?.kind ?? "colegio"} className={inputCls}>
          <option value="colegio">Colegio</option>
          <option value="profesional">Profesional</option>
          <option value="particular">Particular</option>
        </select>
      </Label>
      <Label text="País (código, ej. AR)">
        <input name="country" required maxLength={2} defaultValue={org?.country ?? "AR"} className={`${inputCls} uppercase`} />
      </Label>
      <Label text="Reseller">
        <select name="reseller" defaultValue={org?.reseller_id ?? ""} className={inputCls}>
          <option value="">Sin reseller</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Label>
    </ActionForm>
  );
}
