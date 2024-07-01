"use client";

import {
  Button,
  Checkbox,
  formatNumber,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@bleu/ui";
import { useState } from "react";

import { useOrder } from "#/contexts/ordersContext";
import { getOrderDescription } from "#/lib/orderDescription";
import { DraftOrder } from "#/lib/types";

import { ReviewOrdersDialog } from "./ReviewOrdersDialog";

export function DraftOrdersTab() {
  const { draftOrders, removeDraftOrders } = useOrder();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedOrders = draftOrders.filter((order) =>
    selectedIds.includes(order.id)
  );

  return (
    <>
      <ReviewOrdersDialog
        open={reviewDialogOpen}
        setOpen={setReviewDialogOpen}
        draftOrders={selectedOrders}
      />
      <div className="flex flex-col gap-2">
        <Table className="w-full rounded-md border-separate border">
          <TableHeader className="bg-background/70 text-foreground border-b">
            <TableCell className="rounded-tl-md">
              <span className="sr-only">Select</span>
            </TableCell>
            <TableCell>Order</TableCell>
            <TableCell>Trigger price</TableCell>
            <TableCell>Limit price</TableCell>
            <TableCell className="rounded-tr-md">Current price</TableCell>
          </TableHeader>
          <TableBody>
            {draftOrders.length ? (
              draftOrders.map((order) => {
                return (
                  <DraftOrderRow
                    order={order}
                    key={order.id}
                    onSelect={(selected) => {
                      if (selected) {
                        setSelectedIds([...selectedIds, order.id]);
                        return;
                      }
                      setSelectedIds(
                        selectedIds.filter((id) => id !== order.id)
                      );
                    }}
                  />
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No draft orders. Create a new one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-2">
          <Button
            variant="destructive"
            disabled={!selectedIds.length}
            onClick={() => {
              removeDraftOrders(selectedIds);
              setSelectedIds([]);
            }}
          >
            Delete
          </Button>
          <Button disabled={!selectedIds.length}>Review orders</Button>
        </div>
      </div>
    </>
  );
}

export function DraftOrderRow({
  order,
  onSelect,
}: {
  order: DraftOrder;
  onSelect: (selected: boolean) => void;
}) {
  const orderDescription = getOrderDescription({
    tokenBuy: order.tokenBuy,
    tokenSell: order.tokenSell,
    amountSell: order.amountSell,
    isSellOrder: order.isSellOrder,
    amountBuy: order.amountBuy,
  });

  const priceUnity = `${order.tokenBuy.symbol}/${order.tokenSell.symbol}`;

  return (
    <TableRow className="h-7">
      <TableCell>
        <Checkbox
          onCheckedChange={(checked) => {
            onSelect(checked as boolean);
          }}
        />
      </TableCell>
      <TableCell>{orderDescription}</TableCell>
      <TableCell>
        {formatNumber(order.strikePrice, 4)} {priceUnity}
      </TableCell>
      <TableCell>
        {formatNumber(order.limitPrice, 4)} {priceUnity}
      </TableCell>
      <TableCell>
        {order.marketPrice
          ? ` ${formatNumber(order.marketPrice, 4)} ${priceUnity}`
          : `Market price not found`}
      </TableCell>
    </TableRow>
  );
}
