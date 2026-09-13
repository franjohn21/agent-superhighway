import { submitInvitation } from "@/lib/joining/http";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  return submitInvitation(request, (await params).token, true);
}
