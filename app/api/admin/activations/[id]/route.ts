import { getDatabase } from "@/db";
import { getActivation } from "@/db/admin";
import { errorResponse } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { id } = await params;
    return Response.json({ activation: await getActivation(getDatabase(), actor, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
