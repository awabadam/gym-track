import { SessionDetail } from "@/components/shared/session-detail";

export default async function LogSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { sessionId } = await params;
  const { edit } = await searchParams;
  return (
    <SessionDetail sessionId={sessionId} section="log" edit={edit === "1"} />
  );
}
