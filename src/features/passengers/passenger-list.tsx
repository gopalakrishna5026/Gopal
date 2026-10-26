"use client";

import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { QueryError } from "@/components/shared/query-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { BERTH_PREFERENCES, GENDERS } from "@/lib/constants";
import { deletePassenger, listPassengers } from "@/lib/db/repositories/passengers";
import { errorMessage } from "@/lib/errors";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { PassengerFormDialog } from "./passenger-form-dialog";

export function PassengerList() {
  const user = useAuthStore((s) => s.user)!;
  const { data, error, loading } = useDbQuery(() => listPassengers(user.id), [user.id]);

  const addButton = (
    <PassengerFormDialog
      userId={user.id}
      trigger={
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add passenger
        </Button>
      }
    />
  );

  if (error) return <QueryError error={error} />;
  if (loading) return <ListSkeleton rows={3} />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="passengers-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="passengers-title" className="text-lg font-semibold">Saved passengers</h2>
          <p className="text-sm text-muted-foreground">{data?.length ?? 0} saved · select them quickly while booking.</p>
        </div>
        {!!data?.length && addButton}
      </div>
      {!data?.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No saved passengers</EmptyTitle>
            <EmptyDescription>Add family and friends you often travel with.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((p) => (
            <li key={p.id}>
              <Card size="sm">
                <CardContent className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-accent text-brand">{initials(p.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium">{p.fullName}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {p.age} yrs · {GENDERS.find((g) => g.value === p.gender)?.label}
                      <Badge variant="secondary">{BERTH_PREFERENCES.find((b) => b.value === p.berthPreference)?.label}</Badge>
                      {p.mobile && <span>· {p.mobile}</span>}
                    </span>
                  </div>
                  <PassengerFormDialog
                    userId={user.id}
                    passenger={p}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Edit ${p.fullName}`}>
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${p.fullName}`}>
                        <Trash2Icon />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove {p.fullName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          They&apos;ll be removed from your saved list. Existing tickets are not affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={async () => {
                            try {
                              await deletePassenger(user.id, p.id);
                              toast.success(`${p.fullName} removed.`);
                            } catch (e) {
                              toast.error(errorMessage(e));
                            }
                          }}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
