import { getDatabase } from "@/db";
import { createContact, listContacts, type CreateContactInput } from "@/db/contacts";
import { errorResponse, readJsonBody } from "@/lib/api";
import { requireRequestActor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = requireRequestActor(request);
    return Response.json({ contacts: await listContacts(getDatabase(), actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = requireRequestActor(request);
    const input = await readJsonBody<CreateContactInput>(request);
    const contact = await createContact(getDatabase(), actor, input);
    return Response.json({ contact }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
