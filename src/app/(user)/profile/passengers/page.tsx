import type { Metadata } from "next";
import { PassengerList } from "@/features/passengers/passenger-list";

export const metadata: Metadata = { title: "Saved passengers" };

export default function PassengersPage() {
  return <PassengerList />;
}
