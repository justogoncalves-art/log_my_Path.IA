"use client";

import { runReportQueueNow } from "@/app/admin/actions";
import { btnGhostCls, Result, useAction } from "@/app/admin/ui";

export function RunQueueButton() {
  const { pending, result, run } = useAction();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className={btnGhostCls} disabled={pending} onClick={() => run(runReportQueueNow)}>
        {pending ? "Generando… (puede tardar unos minutos)" : "Generar reportes en cola ahora"}
      </button>
      <Result result={result} />
    </div>
  );
}
