import { getDatabase } from "@/db";
import { createOrder, listOrders, type CreateOrderInput } from "@/db/service";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireRequestActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireRequestActor(request);
    return Response.json({ orders: await listOrders(getDatabase(), actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireRequestActor(request);
    const input = await readJsonBody<CreateOrderInput>(request);
    const order = await createOrder(getDatabase(), actor, input);
    return Response.json({ order }, { status: order.idempotent ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
