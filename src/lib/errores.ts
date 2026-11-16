export type DetalleError = { campo: string; mensaje: string };

export class ErrorApi extends Error {
  readonly estado: number;
  readonly detalles?: DetalleError[];

  constructor(estado: number, mensaje: string, detalles?: DetalleError[]) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
    this.detalles = detalles;
  }
}

export class ErrorValidacion extends ErrorApi {
  constructor(detalles: DetalleError[], mensaje = "Datos inválidos") {
    super(400, mensaje, detalles);
  }
}

export class NoAutorizado extends ErrorApi {
  constructor(mensaje = "Debes iniciar sesión") {
    super(401, mensaje);
  }
}

export class Prohibido extends ErrorApi {
  constructor(mensaje = "No tienes permiso para esta acción") {
    super(403, mensaje);
  }
}

export class NoEncontrado extends ErrorApi {
  constructor(mensaje = "Recurso no encontrado") {
    super(404, mensaje);
  }
}

export class Conflicto extends ErrorApi {
  constructor(mensaje = "La franja ya no está disponible") {
    super(409, mensaje);
  }
}

export class Vencido extends ErrorApi {
  constructor(mensaje = "La franja ya venció") {
    super(410, mensaje);
  }
}

export class DemasiadasSolicitudes extends ErrorApi {
  constructor(mensaje = "Demasiadas solicitudes. Intenta de nuevo en un momento.") {
    super(429, mensaje);
  }
}

export class ErrorInterno extends ErrorApi {
  constructor(mensaje = "Error interno del servidor") {
    super(500, mensaje);
  }
}
