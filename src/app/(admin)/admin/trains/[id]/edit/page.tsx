import type { Metadata } from "next";
import { TrainFormPage } from "@/features/admin/train-form";

export const metadata: Metadata = { title: "Edit train" };

export default async function EditTrainPage({ params }: PageProps<"/admin/trains/[id]/edit">) {
  const { id } = await params;
  return <TrainFormPage trainId={id} />;
}
