"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  callback: () => void | Promise<void>,
  intervaloMs: number,
  activo = true
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    const id = setInterval(() => {
      if (!cancelado) void callbackRef.current();
    }, intervaloMs);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [intervaloMs, activo]);
}
