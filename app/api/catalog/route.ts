import { getDatabase } from "@/db";
import { getCatalog } from "@/db/service";
import { errorResponse } from "@/lib/api";
import { requireRequestActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireRequestActor(request);
    const organizationId = new URL(request.url).searchParams.get("organizationId");
    return Response.json(await getCatalog(getDatabase(), actor, organizationId));
  } catch (error) {
    return errorResponse(error);
  }
}
