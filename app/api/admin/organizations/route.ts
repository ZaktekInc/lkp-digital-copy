import { getDatabase } from "@/db";
import { createAdminOrganization, listAdminOrganizations, type OrganizationInput } from "@/db/admin-data";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireAdminActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireAdminActor(request);
    return Response.json({ organizations: await listAdminOrganizations(getDatabase(), actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireAdminActor(request);
    const input = await readJsonBody<OrganizationInput>(request);
    return Response.json({ organization: await createAdminOrganization(getDatabase(), actor, input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
