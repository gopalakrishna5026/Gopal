import type { Metadata } from "next";
import { TrainTable } from "@/features/admin/train-table";

export const metadata: Metadata = { title: "Trains" };

export default function AdminTrainsPage() {
  return <TrainTable />;
}
