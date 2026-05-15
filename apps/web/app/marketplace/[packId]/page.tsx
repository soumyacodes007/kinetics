import PackDetailClientPage from "./page-client";

export default async function PackDetailPage({
  params
}: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await params;
  return <PackDetailClientPage packId={Number(packId)} />;
}
