import { AuthorizationError } from "./auth";
import { DomainError } from "../db/service";

export function errorResponse(error: unknown): Response {
  if (error instanceof AuthorizationError || error instanceof DomainError) {
    return Response.json(
      { error: error.message, code: error instanceof DomainError ? error.code : "AUTHORIZATION_ERROR" },
      { status: error.status },
    );
  }

  console.error(error);
  return Response.json(
    { error: "Внутренняя ошибка сервера", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new DomainError(400, "INVALID_JSON", "Тело запроса должно содержать корректный JSON");
  }
}
