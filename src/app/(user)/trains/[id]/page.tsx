import type { Metadata } from "next";
import { TrainDetail } from "@/features/trains/train-detail";

export const metadata: Metadata = { title: "Train details" };

export default async function TrainDetailPage({ params }: PageProps<"/trains/[id]">) {
  const { id } = await params;
  return <TrainDetail trainId={id} />;
}
