import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { LandingView } from "@/components/landing/LandingView";

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await currentUser();
  if (user) redirect(user.inbox ? "/inbox" : "/setup");
  return <LandingView deleted={(await searchParams).deleted} />;
}
