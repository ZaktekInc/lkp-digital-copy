import { getDatabase } from "@/db";
import { getReferenceItem, updateReferenceItem } from "@/db/admin";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ kind: string; id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { kind, id } = await params;
    return Response.json({ item: await getReferenceItem(getDatabase(), actor, kind, id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { kind, id } = await params;
    const input = await readJsonBody<{ code?: string; name?: string; description?: string; isActive?: boolean }>(request);
    const item = await updateReferenceItem(getDatabase(), actor, kind, id, input);
    return Response.json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}
