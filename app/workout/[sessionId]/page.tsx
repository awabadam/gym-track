import { SessionDetail } from "@/components/shared/session-detail";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SessionDetail sessionId={sessionId} section="workout" />;
}
