import { getDatabase } from "@/db";
import { listActivations } from "@/db/admin";
import { errorResponse } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAdminActor(request);
    return Response.json({ activations: await listActivations(getDatabase(), actor) });
  } catch (error) {
    return errorResponse(error);
  }
}
