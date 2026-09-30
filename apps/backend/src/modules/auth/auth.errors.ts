import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors.js';

export class EmailAlreadyTakenError extends ConflictError {
  constructor() {
    super('Email já cadastrado');
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Credenciais inválidas');
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super('EMAIL_NOT_VERIFIED', 403, 'Email não verificado. Verifique sua caixa de entrada.');
  }
}

export class InvalidVerificationTokenError extends NotFoundError {
  constructor() {
    super('Token de verificação inválido ou expirado');
  }
}

export class EmailAlreadyVerifiedError extends ConflictError {
  constructor() {
    super('Email já verificado');
  }
}
