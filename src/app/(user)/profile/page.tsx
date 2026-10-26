import type { Metadata } from "next";
import { ProfileOverview } from "@/features/profile/profile-overview";

export const metadata: Metadata = { title: "My profile" };

export default function ProfilePage() {
  return <ProfileOverview />;
}
