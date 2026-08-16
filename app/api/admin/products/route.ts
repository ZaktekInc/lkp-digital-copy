import { getDatabase } from "@/db";
import { createAdminProduct, listAdminProducts, type ProductInput } from "@/db/admin-data";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAdminActor(request);
    return Response.json({ products: await listAdminProducts(getDatabase(), actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAdminActor(request);
    const input = await readJsonBody<ProductInput>(request);
    return Response.json({ product: await createAdminProduct(getDatabase(), actor, input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
