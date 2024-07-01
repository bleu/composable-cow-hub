"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  formatNumber,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from "@bleu/ui";
import { ArrowDownIcon } from "@radix-ui/react-icons";
import cn from "clsx";
import * as React from "react";

import { useOrder } from "#/contexts/ordersContext";
import { useTokens } from "#/contexts/tokensContext";
import { DraftOrder, IToken } from "#/lib/types";

import { AddressWithLink } from "./AddressWithLink";
import { TokenAmount } from "./TokenAmount";
import { TokenInfo } from "./TokenInfo";

export function ReviewOrdersDialog({
  draftOrders,
  open,
  setOpen,
  showAddOrders = false,
}: {
  draftOrders: DraftOrder[];
  open: boolean;
  setOpen: (open: boolean) => void;
  showAddOrders?: boolean;
}) {
  const { addDraftOrders } = useOrder();
  const multipleOrders = draftOrders.length > 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay
          id="dialog-overlay"
          className={cn(
            "bg-black/20 data-[state=open]:animate-overlayShow fixed inset-0 rounded-md"
          )}
        />
        <DialogContent
          className={cn(
            "data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] translate-x-[-50%] translate-y-[-50%] rounded-md focus:outline-none bg-foreground text-background w-[90vw] max-w-[450px] p-[25px]"
          )}
        >
          <div className="flex flex-col gap-2 w-full">
            <DialogTitle className="text-2xl font-medium text-background">
              Review stop-loss order{multipleOrders ? "s" : ""}
            </DialogTitle>
            <TabsRoot>
              <TabsList defaultValue={String(0)} className="flex justify-start">
                {draftOrders.map((_, index) => {
                  return (
                    <TabsTrigger
                      value={String(index)}
                    >{`#${index + 1}`}</TabsTrigger>
                  );
                })}
              </TabsList>
              {draftOrders.map((order, index) => {
                return (
                  <TabsContent value={String(index)}>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <TokenInformation
                        title={
                          order.isSellOrder ? "Sell exactly" : "Sell at most"
                        }
                        token={order.tokenSell}
                        balance={order.amountSell}
                      />
                      <ArrowDownIcon className="size-8" />
                      <TokenInformation
                        title={
                          order.isSellOrder
                            ? "Receive at least"
                            : "Receive exactly"
                        }
                        token={order.tokenBuy}
                        balance={order.amountBuy}
                      />
                      <div className="w-full flex flex-col gap-1 mt-2">
                        <OrderInformation title="Trigger price">
                          {order.tokenSell.symbol} price bellow{" "}
                          {formatNumber(order.strikePrice, 2)}{" "}
                          {order.tokenBuy.symbol}
                        </OrderInformation>
                        <OrderInformation title="Limit price">
                          {order.tokenSell.symbol} price bellow{" "}
                          {formatNumber(order.limitPrice, 2)}{" "}
                          {order.tokenBuy.symbol}
                        </OrderInformation>
                        <OrderInformation title="Type">
                          {order.partiallyFillable
                            ? "Partial fillable"
                            : "Fill or Kill"}
                        </OrderInformation>
                        <OrderInformation title="Receiver">
                          <AddressWithLink address={order.receiver} />
                        </OrderInformation>
                        <OrderInformation
                          title={`${order.tokenSell.symbol} oracle`}
                        >
                          <AddressWithLink address={order.tokenSellOracle} />
                        </OrderInformation>
                        <OrderInformation
                          title={`${order.tokenBuy.symbol} oracle`}
                        >
                          <AddressWithLink address={order.tokenBuyOracle} />
                        </OrderInformation>
                        <OrderInformation title="Oracles condition">
                          Last update on the last{" "}
                          {formatNumber(order.maxHoursSinceOracleUpdates, 2)}{" "}
                          hour
                          {order.maxHoursSinceOracleUpdates > 1 && "s"}
                        </OrderInformation>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </TabsRoot>

            <Button className="w-full mt-3">
              {multipleOrders
                ? `Place all ${draftOrders.length} stop-loss orders`
                : "Place stop-loss order"}
            </Button>
            {showAddOrders && (
              <Button
                variant="link"
                className="text-background text-wrap text-xs"
                onClick={() => {
                  addDraftOrders(draftOrders);
                  setOpen(false);
                }}
              >
                Want to place another orders to save fees? Click here to save
                this one into drafts and create another one.
              </Button>
            )}
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

function OrderInformation({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm border-b border-background">
      <span>{title}</span>
      <span>{children}</span>
    </div>
  );
}

function TokenInformation({
  title,
  token,
  balance,
}: {
  title: string;
  token: IToken;
  balance: number;
}) {
  const [tokenPrice, setTokenPrice] = React.useState<number>();
  const { getOrFetchTokenPrice } = useTokens();

  React.useEffect(() => {
    getOrFetchTokenPrice(token).then(setTokenPrice);
  }, [token]);

  return (
    <div className="flex flex-col gap-2 bg-background/80 text-foreground rounded-md p-2 w-full">
      <span className="text-xs">{title}</span>
      <div className="flex items-center justify-between">
        <TokenInfo token={token} />
        <TokenAmount
          token={token}
          balance={balance}
          usdPrice={tokenPrice || 0}
        />
      </div>
    </div>
  );
}
