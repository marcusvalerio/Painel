"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Leva para Configurações enquanto a senha provisória não for trocada. */
export function ForceRedirect() {
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { if (path !== "/app/configuracoes") router.replace("/app/configuracoes"); }, [path, router]);
  return null;
}
