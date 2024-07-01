"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@bleu/ui";
import cn from "clsx";

import { useOrder } from "#/contexts/ordersContext";

export function TxPendingDialog() {
  const {
    txManager: { isPonderUpdating },
    txPendingDialog,
    setTxPendingDialog,
  } = useOrder();

  return (
    <Dialog open={txPendingDialog} onOpenChange={setTxPendingDialog}>
      <DialogPortal>
        <DialogOverlay
          id="dialog-overlay"
          className={cn(
            "bg-black/20 data-[state=open]:animate-overlayShow fixed inset-0 rounded-md"
          )}
        />
        <DialogContent
          className={cn(
            "data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] rounded-md focus:outline-none bg-foreground text-background w-[90vw] max-w-[450px] p-[25px] overflow-auto"
          )}
        >
          <div className="flex flex-col gap-2 w-full">
            <DialogTitle className="text-2xl font-medium text-background">
              Transaction pending
            </DialogTitle>
            <span className="text-wrap">
              Almost done! Your transaction is being processed. Click on the
              button bellow to go back to the dashboard.
            </span>
            <Button
              className="w-full mt-3"
              onClick={() => {
                setTxPendingDialog(false);
              }}
              disabled={isPonderUpdating}
            >
              {isPonderUpdating
                ? "Processing transaction..."
                : "Back to dashboard"}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
