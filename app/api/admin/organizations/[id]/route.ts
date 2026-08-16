import { getDatabase } from "@/db";
import { deleteAdminOrganization, getAdminOrganization, updateAdminOrganization, type OrganizationInput } from "@/db/admin-data";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    return Response.json({ organization: await getAdminOrganization(getDatabase(), actor, (await params).id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    const input = await readJsonBody<OrganizationInput>(request);
    return Response.json({ organization: await updateAdminOrganization(getDatabase(), actor, (await params).id, input) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const actor = requireAdminActor(request);
    return Response.json(await deleteAdminOrganization(getDatabase(), actor, (await params).id));
  } catch (error) {
    return errorResponse(error);
  }
}
