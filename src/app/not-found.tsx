import Link from "next/link";
import { MapPinOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinOffIcon />
          </EmptyMedia>
          <EmptyTitle>Wrong platform</EmptyTitle>
          <EmptyDescription>The page you&apos;re looking for doesn&apos;t exist or has moved.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
