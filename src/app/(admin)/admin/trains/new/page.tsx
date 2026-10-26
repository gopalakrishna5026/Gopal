import type { Metadata } from "next";
import { TrainFormPage } from "@/features/admin/train-form";

export const metadata: Metadata = { title: "Add train" };

export default function NewTrainPage() {
  return <TrainFormPage />;
}
