"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { campusText, type CampusLang } from "@/lib/i18n-campus";
import { useCompare } from "../compare";

// La selección vive en el navegador. Al entrar con ?c= (un link) esa selección pasa a ser la guardada;
// después, cada cambio (quitar una carrera) actualiza la URL.
export function CompareSync({ ids, fromUrl }: { ids: string[]; fromUrl: boolean }) {
  const router = useRouter();
  const { ids: stored, set } = useCompare();
  const synced = useRef(false);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      if (fromUrl) {
        if (stored.join(",") !== ids.join(",")) set(ids);
        return;
      }
    }
    const target = stored.length ? `/m/campus/comparar?c=${stored.join(",")}` : "/m/campus/comparar";
    // Una sola vez por destino: si alguna carrera ya no existe, no se entra en un ciclo
    if (stored.join(",") !== ids.join(",") && last.current !== target) {
      last.current = target;
      router.replace(target);
    }
  }, [stored, ids, fromUrl, router, set]);
  return null;
}

function Remove({ id, lang }: { id: string; lang: CampusLang }) {
  const c = campusText(lang);
  const { remove } = useCompare();
  return (
    <button type="button" onClick={() => remove(id)} className="mt-1 block cursor-pointer text-xs font-normal text-muted hover:text-danger">
      {c.remove}
    </button>
  );
}
CompareSync.Remove = Remove;
