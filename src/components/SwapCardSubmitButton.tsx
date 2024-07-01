"use client";

import { Button } from "@bleu/ui";
import { useFormContext, useWatch } from "react-hook-form";
import { Address } from "viem";

import { useOrder } from "#/contexts/ordersContext";
import { useSwapCardContext } from "#/contexts/swapCardContext";
import {
  AdvancedSwapSettings,
  DraftOrder,
  IToken,
  SwapData,
} from "#/lib/types";

export function SwapCardSubmitButton() {
  const { draftOrders } = useOrder();
  const {
    formState: { isSubmitting },
    control,
  } = useFormContext<SwapData>();
  const { tokenBuyOracle, tokenSellOracle, advancedSettings, isLoading } =
    useSwapCardContext();
  const [
    tokenBuy,
    tokenSell,
    buyAmount,
    sellAmount,
    strikePrice,
    limitPrice,
    marketPrice,
  ] = useWatch({
    control,
    name: [
      "tokenBuy",
      "tokenSell",
      "amountBuy",
      "amountSell",
      "strikePrice",
      "limitPrice",
      "marketPrice",
    ],
  });

  const { disabled, text } = getButtonState({
    draftOrders,
    tokenBuy,
    tokenSell,
    buyAmount,
    sellAmount,
    strikePrice,
    marketPrice,
    limitPrice,
    tokenSellOracle,
    tokenBuyOracle,
    advancedSettings,
  });

  return (
    <Button
      className="rounded-md text-wrap py-2 h-auto"
      type="submit"
      loading={isSubmitting || isLoading}
      loadingText={isSubmitting ? "Validating..." : "Loading..."}
      disabled={disabled}
    >
      {text}
    </Button>
  );
}

function getButtonState({
  draftOrders,
  tokenBuy,
  tokenSell,
  buyAmount,
  sellAmount,
  strikePrice,
  marketPrice,
  limitPrice,
  tokenSellOracle,
  tokenBuyOracle,
  advancedSettings,
}: {
  draftOrders: DraftOrder[];
  tokenBuy?: IToken;
  tokenSell?: IToken;
  buyAmount?: number;
  sellAmount?: number;
  strikePrice?: number;
  marketPrice?: number;
  limitPrice?: number;
  tokenSellOracle?: Address;
  tokenBuyOracle?: Address;
  advancedSettings: AdvancedSwapSettings;
}): {
  disabled: boolean;
  text: string;
} {
  if (draftOrders.length > 4) {
    return {
      disabled: true,
      text: "You can only have 5 draft orders at a time",
    };
  }
  if (!tokenBuy || !tokenSell) {
    return {
      disabled: true,
      text: "Please select tokens",
    };
  }
  if (tokenBuy.address.toLowerCase() === tokenSell.address.toLowerCase()) {
    return {
      disabled: true,
      text: "Tokens must be different",
    };
  }
  if (!buyAmount && !sellAmount) {
    return {
      disabled: true,
      text: "Please enter amounts",
    };
  }
  if (!limitPrice) {
    return {
      disabled: true,
      text: "Please enter the limit price",
    };
  }
  if (!strikePrice) {
    return {
      disabled: true,
      text: "Please enter the trigger price",
    };
  }
  if (marketPrice && strikePrice > marketPrice) {
    return {
      disabled: true,
      text: "Strike price must be lower than market price",
    };
  }
  if (
    (!tokenBuyOracle && !advancedSettings.tokenBuyOracle) ||
    (!tokenSellOracle && !advancedSettings.tokenSellOracle)
  ) {
    return {
      disabled: true,
      text: "Error finding token oracles, set it manually in advanced settings",
    };
  }

  if (!marketPrice) {
    return {
      disabled: true,
      text: "Error quoting tokens, make sure that CoW supports them.",
    };
  }
  return {
    disabled: false,
    text: "Review stop-loss order",
  };
}
