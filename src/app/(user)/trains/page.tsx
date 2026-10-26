import type { Metadata } from "next";
import { SearchResults } from "@/features/trains/search-results";

export const metadata: Metadata = { title: "Find trains" };

export default function TrainsPage() {
  return <SearchResults />;
}
