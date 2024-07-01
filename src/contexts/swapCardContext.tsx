"use client";

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import React from "react";
import { Address } from "viem";

import { CHAINS_ORACLE_ROUTER_FACTORY } from "#/lib/oracleRouter";
import { ChainId } from "#/lib/publicClients";
import {
  AdvancedSwapSettings,
  DraftOrder,
  IToken,
  SwapData,
} from "#/lib/types";

import { useOrder } from "./ordersContext";

interface ISwapContext {
  currentDraftOrder?: DraftOrder;
  advancedSettings: AdvancedSwapSettings;
  createDraftOrder: (data: SwapData) => DraftOrder;
  reviewDialogOpen: boolean;
  setReviewDialogOpen: (open: boolean) => void;
  setAdvancedSettings: (data: AdvancedSwapSettings) => void;
  setCurrentDraftOrder: (data: DraftOrder) => void;
  updateOracle: (data: {
    tokenSell?: IToken;
    tokenBuy?: IToken;
  }) => Promise<void>;
  tokenSellOracle?: Address;
  tokenBuyOracle?: Address;
  isLoading: boolean;
}

export const SwapCardContext = React.createContext<ISwapContext>(
  {} as ISwapContext
);

export const SwapCardContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    safe: { safeAddress, chainId },
  } = useSafeAppsSDK();
  const { draftOrders } = useOrder();

  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);

  const [tokenSellOracle, setTokenSellOracle] = React.useState<Address>();
  const [tokenBuyOracle, setTokenBuyOracle] = React.useState<Address>();
  const [currentDraftOrder, setCurrentDraftOrder] =
    React.useState<DraftOrder>();

  const [advancedSettings, setAdvancedSettings] =
    React.useState<AdvancedSwapSettings>({
      receiver: safeAddress,
      maxHoursSinceOracleUpdates: 1,
      tokenBuyOracle: "",
      tokenSellOracle: "",
      partiallyFillable: false,
    });

  const [isLoading, setIsLoading] = React.useState(false);

  const oracleRouterClass = CHAINS_ORACLE_ROUTER_FACTORY[chainId as ChainId];

  async function updateOracle({
    tokenSell,
    tokenBuy,
  }: {
    tokenSell?: IToken;
    tokenBuy?: IToken;
  }) {
    if (!tokenSell || !tokenBuy) return;
    setIsLoading(true);
    const oracleRouter = new oracleRouterClass({
      chainId: chainId as ChainId,
      tokenBuy: tokenBuy,
      tokenSell: tokenSell,
    });
    try {
      const { tokenBuyOracle, tokenSellOracle } =
        await oracleRouter.findRoute();
      setTokenBuyOracle(tokenBuyOracle);
      setTokenSellOracle(tokenSellOracle);
    } catch {
      setTokenBuyOracle(undefined);
      setTokenSellOracle(undefined);
    }
    setIsLoading(false);
  }

  function createDraftOrder(data: SwapData) {
    const draftOrder: DraftOrder = {
      ...data,
      ...advancedSettings,
      id: `draft-${draftOrders.length}-${Date.now()}`,
    };
    if (!advancedSettings.tokenBuyOracle || !advancedSettings.tokenSellOracle) {
      if (!tokenBuyOracle || !tokenSellOracle) {
        throw new Error("Chainlink oracle not found");
      }
      draftOrder.tokenBuyOracle = tokenBuyOracle;
      draftOrder.tokenSellOracle = tokenSellOracle;
    }
    return draftOrder;
  }

  return (
    <SwapCardContext.Provider
      value={{
        isLoading,
        reviewDialogOpen,
        setReviewDialogOpen,
        currentDraftOrder,
        setCurrentDraftOrder,
        createDraftOrder,
        advancedSettings,
        setAdvancedSettings,
        updateOracle,
        tokenSellOracle,
        tokenBuyOracle,
      }}
    >
      {children}
    </SwapCardContext.Provider>
  );
};

export const useSwapCardContext = () => React.useContext(SwapCardContext);
