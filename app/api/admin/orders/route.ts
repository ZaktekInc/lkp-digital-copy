import { getDatabase } from "@/db";
import { listOrders } from "@/db/service";
import { errorResponse } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAdminActor(request);
    const url = new URL(request.url);
    const orders = await listOrders(
      getDatabase(),
      actor,
      {
        organizationId: url.searchParams.get("organizationId"),
        status: url.searchParams.get("status"),
      },
      true,
    );
    return Response.json({ orders });
  } catch (error) {
    return errorResponse(error);
  }
}
