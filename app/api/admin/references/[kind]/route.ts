import { getDatabase } from "@/db";
import { createReferenceItem, listReferenceItems } from "@/db/admin";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ kind: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { kind } = await params;
    return Response.json({ items: await listReferenceItems(getDatabase(), actor, kind) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { kind } = await params;
    const input = await readJsonBody<{ code?: string; name?: string; description?: string }>(request);
    const item = await createReferenceItem(getDatabase(), actor, kind, input);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
