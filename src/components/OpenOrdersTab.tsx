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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";

import { StopLossOrderType, useOrder } from "#/contexts/ordersContext";
import { useTokens } from "#/contexts/tokensContext";
import { getOrderDescription } from "#/lib/orderDescription";
import { OrderCancelArgs, TRANSACTION_TYPES } from "#/lib/transactionFactory";
import { IToken } from "#/lib/types";

export function OpenOrdersTab() {
  const {
    openOrders,
    txManager: { writeContract, isWriting },
    setTxPendingDialog,
  } = useOrder();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onCancelOrders = () => {
    const orders = openOrders.filter((order) => selectedIds.includes(order.id));
    const deleteTxArgs = orders.map((order) => ({
      type: TRANSACTION_TYPES.ORDER_CANCEL,
      hash: order.hash,
    })) as OrderCancelArgs[];
    writeContract(deleteTxArgs, {
      onSuccess: () => {
        setSelectedIds([]);
        setTxPendingDialog(true);
      },
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Table className="w-full rounded-md border-separate border">
        <TableHeader className="bg-background/70 text-foreground border-b">
          <TableCell className="rounded-tl-md">
            <span className="sr-only">Select</span>
          </TableCell>
          <TableCell>Order</TableCell>
          <TableCell>Trigger price</TableCell>
          <TableCell>Current price</TableCell>
          <TableCell className="rounded-tr-md">Filled</TableCell>
        </TableHeader>
        <TableBody>
          {openOrders.length ? (
            openOrders.map((order) => {
              return (
                <OpenOrderRow
                  order={order}
                  key={order.id}
                  onSelect={(selected) => {
                    if (selected) {
                      setSelectedIds([...selectedIds, order.id]);
                      return;
                    }
                    setSelectedIds(selectedIds.filter((id) => id !== order.id));
                  }}
                />
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                No open orders. Create a new one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2">
        <Button
          variant="destructive"
          disabled={!selectedIds.length}
          onClick={onCancelOrders}
          loading={isWriting}
          loadingText={"Cancelling..."}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function OpenOrderRow({
  order,
  onSelect,
}: {
  order: StopLossOrderType;
  onSelect: (selected: boolean) => void;
}) {
  const router = useRouter();
  const [marketPrice, setMarketPrice] = useState<number>();
  const { getTokenPairPrice } = useTokens();

  async function fetchMarketPrice() {
    if (!order.stopLossData) {
      return;
    }
    const price = await getTokenPairPrice(
      order.stopLossData.tokenIn as IToken,
      order.stopLossData.tokenOut as IToken
    );
    setMarketPrice(price);
  }

  useEffect(() => {
    fetchMarketPrice();
  }, [order]);

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
      <TableCell
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="cursor-default"
      >
        <Checkbox
          onCheckedChange={(checked) => {
            onSelect(checked as boolean);
          }}
        />
      </TableCell>
      <TableCell>{orderDescription}</TableCell>
      <TableCell>
        {formatNumber(triggerPrice, 4)} {priceUnity}
      </TableCell>
      <TableCell>
        {marketPrice
          ? ` ${formatNumber(marketPrice, 4)} ${priceUnity}`
          : `Loading...`}
      </TableCell>
      <TableCell>0%</TableCell>
    </TableRow>
  );
}
