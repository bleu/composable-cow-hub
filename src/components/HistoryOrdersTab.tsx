"use client";

import {
  formatNumber,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@bleu/ui";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";

import { StopLossOrderType, useOrder } from "#/contexts/ordersContext";
import { getOrderDescription } from "#/lib/orderDescription";
import { IToken } from "#/lib/types";

import { Spinner } from "./Spinner";
import { StatusBadge } from "./StatusBadge";

export function HistoryOrdersTab() {
  const { historyOrders, isLoading } = useOrder();

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Table className="w-full rounded-md border-separate border">
      <TableHeader className="bg-background/70 text-foreground border-b overflow-scroll">
        <TableCell>Order</TableCell>
        <TableCell>Trigger price</TableCell>
        <TableCell>Filled</TableCell>
        <TableCell className="rounded-tr-md">Status</TableCell>
      </TableHeader>
      <TableBody>
        {historyOrders.length ? (
          historyOrders.map((order) => {
            return <HistoryOrderRow order={order} key={order.id} />;
          })
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              No history orders. Create a new one to get started.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export function HistoryOrderRow({ order }: { order: StopLossOrderType }) {
  const router = useRouter();
  if (!order.stopLossData) {
    return null;
  }

  const priceUnity =
    order.stopLossData.tokenOut.symbol +
    "/" +
    order.stopLossData.tokenIn.symbol;

  const triggerPrice = formatUnits(order.stopLossData?.strike, 18);

  const amountSell = Number(
    formatUnits(
      order.stopLossData?.tokenAmountIn,
      order.stopLossData.tokenIn.decimals
    )
  );
  const amountBuy = Number(
    formatUnits(
      order.stopLossData?.tokenAmountOut,
      order.stopLossData.tokenOut.decimals
    )
  );

  const orderDescription = getOrderDescription({
    tokenSell: order.stopLossData.tokenIn as IToken,
    tokenBuy: order.stopLossData.tokenOut as IToken,
    amountSell,
    amountBuy,
    isSellOrder: order.stopLossData.isSellOrder,
  });

  return (
    <TableRow
      onClick={() => router.push(`/refactor/${order?.hash}`)}
      className="cursor-pointer hover:bg-background/10"
    >
      <TableCell>{orderDescription}</TableCell>
      <TableCell>
        {formatNumber(triggerPrice, 4)} {priceUnity}
      </TableCell>
      <TableCell className="flex items-center gap-2">0%</TableCell>
      <TableCell>
        <StatusBadge status={order.status} />
      </TableCell>
    </TableRow>
  );
}
