import { AppError, ConflictError, NotFoundError } from '@/lib/errors.js';

export class LibraryEntryNotFoundError extends NotFoundError {
  constructor() {
    super('Library entry');
  }
}

export class LibraryEntryAlreadyExistsError extends ConflictError {
  constructor() {
    super('Game already in library');
  }
}

export class LibraryEntryNotInQueueError extends AppError {
  constructor() {
    super('NOT_IN_QUEUE', 400, 'Só a fila tem ordem.');
  }
}
