import { RequireAuth } from "@/components/shared/guards";
import { PageContainer, PageHeader } from "@/components/shared/page-header";
import { ProfileNav } from "@/features/profile/profile-nav";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return (
    <RequireAuth>
      <PageContainer className="max-w-5xl">
        <PageHeader title="My account" description="Manage your details, co-travellers and payment methods." />
        <ProfileNav />
        {children}
      </PageContainer>
    </RequireAuth>
  );
}
