"use client";

import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "@bleu/ui";

import { useOrder } from "#/contexts/ordersContext";

import { DraftOrdersTab } from "./DraftOrdersTab";
import { HistoryOrdersTab } from "./HistoryOrdersTab";

export function OrderTabs() {
  const { openOrders, historyOrders, draftOrders } = useOrder();

  return (
    <TabsRoot className="w-full flex flex-col gap-2" defaultValue="draft">
      <div className="flex flex-row justify-between items-center">
        <span className="text-2xl font-semibold">Your orders</span>
        <TabsList>
          <TabsTrigger value="draft">Draft ({draftOrders.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({openOrders.length})</TabsTrigger>
          <TabsTrigger value="history">
            History ({historyOrders.length})
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex rounded-md text-background bg-foreground p-2">
        <TabsContent className="w-full" value="draft">
          <DraftOrdersTab />
        </TabsContent>
        <TabsContent className="w-full" value="open">
          Open orders
        </TabsContent>
        <TabsContent className="w-full" value="history">
          <HistoryOrdersTab />
        </TabsContent>
      </div>
    </TabsRoot>
  );
}
