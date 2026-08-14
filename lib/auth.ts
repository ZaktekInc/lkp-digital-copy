export const ADMIN_EMAIL = "seregaswimer@gmail.com";

export type RequestActor = {
  userId: string;
  email: string;
  isAdmin: boolean;
};

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
    this.name = "AuthorizationError";
  }
}

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";

function localDevelopmentActor(request: Request): RequestActor | null {
  // Vite replaces this expression with `false` in production builds. The
  // production artifact is covered by a regression test that requires an
  // anonymous localhost request to remain unauthorized.
  const isDevelopment = import.meta.env?.DEV === true;
  if (!isDevelopment) return null;

  const hostname = new URL(request.url).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return null;

  return {
    userId: "local-development-admin",
    email: ADMIN_EMAIL,
    isAdmin: true,
  };
}

export function getRequestActor(request: Request): RequestActor | null {
  const userId = request.headers.get(USER_ID_HEADER)?.trim();
  const email = request.headers.get(USER_EMAIL_HEADER)?.trim().toLowerCase();

  if (userId && email) {
    return { userId, email, isAdmin: email === ADMIN_EMAIL };
  }

  // Never turn a malformed or partially forwarded platform identity into the
  // local development administrator.
  if (userId || email) return null;

  return localDevelopmentActor(request);
}

export function requireRequestActor(request: Request): RequestActor {
  const actor = getRequestActor(request);
  if (!actor) throw new AuthorizationError(401, "Требуется авторизация");
  return actor;
}

export function requireAdminActor(request: Request): RequestActor {
  const actor = requireRequestActor(request);
  if (!actor.isAdmin) throw new AuthorizationError(403, "Требуются права администратора");
  return actor;
}
