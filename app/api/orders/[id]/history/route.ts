import { getDatabase } from "@/db";
import { getOrder } from "@/db/service";
import { errorResponse } from "@/lib/api";
import { requireRequestActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireRequestActor(request);
    const { id } = await params;
    const order = await getOrder(getDatabase(), actor, id);
    return Response.json({ history: order.history });
  } catch (error) {
    return errorResponse(error);
  }
}
