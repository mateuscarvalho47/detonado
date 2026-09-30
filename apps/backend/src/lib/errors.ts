export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 400, 'Dados inválidos', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sem permissão') {
    super('FORBIDDEN', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', 404, `${resource} não encontrado`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', 409, message);
  }
}

export class IgdbError extends AppError {
  constructor(message: string, statusCode = 502) {
    super('IGDB_ERROR', statusCode, message);
  }
}

export class EmailDeliveryError extends AppError {
  constructor() {
    super(
      'EMAIL_DELIVERY_FAILED',
      503,
      'Não foi possível enviar o e-mail. Tente de novo em alguns minutos.',
    );
  }
}
