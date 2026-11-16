"use client";

import { useSyncExternalStore } from "react";

const suscribir = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

/**
 * `false` durante el render del servidor y la hidratación, `true` en el
 * cliente tras hidratar. Permite mostrar valores que solo existen en el
 * navegador (zona horaria, formato local) sin `setState` dentro de un efecto.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(suscribir, enCliente, enServidor);
}
