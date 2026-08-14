import { getDatabase } from "@/db";
import { getOrder, updateOrderStatus } from "@/db/service";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { id } = await params;
    return Response.json({ order: await getOrder(getDatabase(), actor, id, true) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const { id } = await params;
    const body = await readJsonBody<{ status?: string } | null>(request);
    const status = body && typeof body === "object" && !Array.isArray(body) ? body.status ?? "" : "";
    const order = await updateOrderStatus(getDatabase(), actor, id, status);
    return Response.json({ order });
  } catch (error) {
    return errorResponse(error);
  }
}
