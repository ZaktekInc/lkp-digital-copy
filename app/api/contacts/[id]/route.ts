import { getDatabase } from "@/db";
import { getContact } from "@/db/contacts";
import { errorResponse } from "@/lib/api";
import { requireRequestActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireRequestActor(request);
    const { id } = await params;
    return Response.json({ contact: await getContact(getDatabase(), actor, id) });
  } catch (error) {
    return errorResponse(error);
  }
}
