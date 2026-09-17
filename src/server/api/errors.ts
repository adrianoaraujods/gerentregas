import { TRPCError } from "@trpc/server";

export class BadRequestError extends TRPCError {
  constructor(message: string) {
    super({ code: "BAD_REQUEST", message });
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends TRPCError {
  constructor(message: string) {
    super({ code: "UNAUTHORIZED", message });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends TRPCError {
  constructor(message: string) {
    super({ code: "FORBIDDEN", message });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends TRPCError {
  constructor(message: string) {
    super({ code: "NOT_FOUND", message });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends TRPCError {
  constructor(message: string) {
    super({ code: "CONFLICT", message });
    this.name = "ConflictError";
  }
}
