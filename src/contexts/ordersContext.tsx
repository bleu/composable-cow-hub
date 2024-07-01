"use client";

import { ArrElement, GetDeepProp } from "@bleu/ui";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { createContext, PropsWithChildren, useContext, useState } from "react";
import useSWR from "swr";
import { Address } from "viem";

import { composableCowAbi } from "#/lib/abis/composableCow";
import { COMPOSABLE_COW_ADDRESS } from "#/lib/contracts";
import { getCowOrders } from "#/lib/cowApi/fetchCowOrder";
import { composableCowApi } from "#/lib/gql/client";
import { UserStopLossOrdersQuery } from "#/lib/gql/composable-cow/__generated__/1";
import { ChainId, publicClientsFromIds } from "#/lib/publicClients";
import { DraftOrder, IToken } from "#/lib/types";

type StopLossOrderTypeRaw = ArrElement<
  GetDeepProp<UserStopLossOrdersQuery, "items">
>;

export interface StopLossOrderType extends StopLossOrderTypeRaw {
  status?: string;
  executedBuyAmount?: string;
  executedSellAmount?: string;
  executedSurplusFee?: string;
  singleOrder?: Address | boolean | undefined;
}

export interface StopLossPendingOrderType {
  tokenIn: IToken;
  tokenOut: IToken;
  status: string;
}
interface singleOrderReturn {
  error?: Error;
  result?: Address;
  status: "success" | "failure";
}

type singleOrder = Address | boolean | undefined;

export interface CowOrder {
  appData: string;
  availableBalance: string;
  buyAmount: string;
  buyToken: string;
  buyTokenBalance: string;
  class: string;
  creationDate: string;
  executedBuyAmount: string;
  executedFeeAmount: string;
  executedSellAmount: string;
  executedSellAmountBeforeFees: string;
  executedSurplusFee: string;
  feeAmount: string;
  fullAppData: string;
  fullFeeAmount: string;
  interactions: {
    pre: Array<string>;
    post: Array<string>;
  };
  invalidated: boolean;
  isLiquidityOrder: boolean;
  kind: string;
  owner: string;
  partiallyFillable: boolean;
  receiver: string;
  sellAmount: string;
  sellToken: string;
  sellTokenBalance: string;
  settlementContract: string;
  signature: string;
  signingScheme: string;
  solverFee: string;
  status: string;
  uid: string;
  validTo: number;
}

type OrderContextType = {
  draftOrders: DraftOrder[];
  setDraftOrders: (orders: DraftOrder[]) => void;
  addDraftOrders: (orders: DraftOrder[]) => void;
  removeDraftOrders: (id: string[]) => void;
  orders: StopLossOrderType[];
  openOrders: StopLossOrderType[];
  historyOrders: StopLossOrderType[];
  isLoading: boolean;
  error: boolean;
  mutate: () => void;
  getRelatedCowOrders: ({
    appData,
  }: {
    appData: string;
  }) => Promise<CowOrder[] | undefined>;
};

export const OrderContext = createContext({} as OrderContextType);

export function OrderProvider({ children }: PropsWithChildren) {
  const { safe } = useSafeAppsSDK();
  const {
    data: orders,
    mutate,
    isLoading,
    error,
  } = useSWR(
    {
      chainId: safe.chainId as ChainId,
      address: safe.safeAddress as Address,
    },
    getProcessedStopLossOrders,
    {
      fallbackData: [],
    }
  );

  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([]);

  function addDraftOrders(orders: DraftOrder[]): void {
    setDraftOrders([...draftOrders, ...orders]);
  }

  function removeDraftOrders(ids: string[]): void {
    setDraftOrders(draftOrders.filter((order) => !ids.includes(order.id)));
  }

  async function getProcessedStopLossOrders({
    chainId,
    address,
  }: {
    chainId: ChainId;
    address: Address;
  }): Promise<StopLossOrderType[]> {
    const publicClient = publicClientsFromIds[chainId];
    const rawOrdersData = await composableCowApi
      .gql(chainId)
      .UserStopLossOrders({
        user: `${address}-${chainId}`,
      });
    const cowOrders = await getCowOrders(address, chainId);

    if (!rawOrdersData?.orders?.items) {
      return [];
    }

    const ordersNeedingCheck = rawOrdersData.orders.items.filter((order) => {
      const cowOrderMatch = cowOrders.find(
        (cowOrder) => cowOrder.appData === order.stopLossData?.appData
      );
      return !cowOrderMatch || cowOrderMatch.status === "open";
    });

    let multicallResults: singleOrderReturn[] = [];

    if (ordersNeedingCheck.length > 0) {
      multicallResults = await publicClient.multicall({
        contracts: ordersNeedingCheck.map((order) => ({
          address: COMPOSABLE_COW_ADDRESS,
          abi: composableCowAbi,
          functionName: "singleOrders",
          args: [address, order.hash],
        })),
      });
    }

    const ordersWithStatus = rawOrdersData.orders.items.map((order) => {
      const cowOrdersMatch = cowOrders.filter(
        (cowOrder) => cowOrder.appData === order.stopLossData?.appData
      );
      let singleOrderResult: singleOrder = true;

      const orderIndex = ordersNeedingCheck.findIndex(
        (o) => o.hash === order.hash
      );
      if (orderIndex !== -1) {
        singleOrderResult = multicallResults[orderIndex]?.result;
      }

      const orderWithoutStatus = {
        ...order,
        executedBuyAmount: String(
          cowOrdersMatch?.reduce(
            (acc, cowOrder) => acc + Number(cowOrder.executedBuyAmount),
            0
          )
        ),
        executedSellAmount: String(
          cowOrdersMatch?.reduce(
            (acc, cowOrder) => acc + Number(cowOrder.executedSellAmount),
            0
          )
        ),
        singleOrder: singleOrderResult,
      };

      const status = getOrderStatus({
        order: orderWithoutStatus,
        cowOrdersMatch,
      });

      return {
        ...orderWithoutStatus,
        status,
      };
    });
    return ordersWithStatus;
  }

  async function getRelatedCowOrders({
    appData,
  }: {
    appData: string;
  }): Promise<CowOrder[] | undefined> {
    const cowOrders = await getCowOrders(
      safe.safeAddress as Address,
      safe.chainId as ChainId
    );
    return cowOrders.filter((order) => order.appData === appData);
  }

  function getOrderStatus({
    order,
    cowOrdersMatch,
  }: {
    order: Omit<StopLossOrderType, "status">;
    cowOrdersMatch: CowOrder[] | undefined;
  }) {
    if (
      cowOrdersMatch &&
      cowOrdersMatch.some(({ status }) => status === "fulfilled")
    ) {
      if (order?.stopLossData?.isPartiallyFillable) {
        if (order?.singleOrder) {
          return "partiallyFilled";
        }
      }
      return "fulfilled";
    }
    if (!order?.singleOrder) {
      return "cancelled";
    }
    return "created";
  }

  const historyOrders = orders.filter((order) => !order.singleOrder);
  const openOrders = orders.filter((order) => order.singleOrder);

  return (
    <OrderContext.Provider
      value={{
        historyOrders,
        openOrders,
        draftOrders,
        setDraftOrders,
        addDraftOrders,
        removeDraftOrders,
        isLoading,
        error,
        mutate,
        getRelatedCowOrders,
        orders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  return context;
}
