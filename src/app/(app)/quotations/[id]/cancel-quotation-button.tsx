"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { cancelQuotationAction } from "../actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CancelQuotationButton({
  quotationId,
  quotationNumber,
}: {
  quotationId: string;
  quotationNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="outline" className="text-red-600" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4 mr-1" /> Cancel
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quotation cancel karein?</AlertDialogTitle>
            <AlertDialogDescription>
              {quotationNumber} cancel ho jayegi — phir convert nahi ho sakegi. Record mehfooz
              rahega.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Wapas</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await cancelQuotationAction(quotationId);
                  if (result.ok) {
                    toast.success("Quotation cancel ho gayi.");
                    router.refresh();
                  } else {
                    toast.error(result.error ?? "Cancel nahi ho saki.");
                  }
                })
              }
            >
              {pending ? "…" : "Cancel Quotation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
