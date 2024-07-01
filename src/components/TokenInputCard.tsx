import {
  Card,
  CardContent,
  CardTitle,
  convertStringToNumberAndRoundDown,
  formatNumber,
} from "@bleu/ui";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { memo, useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Address } from "viem";

import { useSwapCardContext } from "#/contexts/swapCardContext";
import { useTokens } from "#/contexts/tokensContext";
import { calculateAmounts } from "#/lib/calculateAmounts";
import { ChainId } from "#/lib/publicClients";
import { fetchFormattedBalancerOf } from "#/lib/tokenUtils";
import { SwapData } from "#/lib/types";

import { Input } from "./Input";
import { TokenSelect } from "./TokenSelect";

function TokenInputCardComponent({ side }: { side: "Sell" | "Buy" }) {
  const {
    safe: { safeAddress, chainId },
  } = useSafeAppsSDK();

  const {
    setValue,
    register,
    control,
    getValues,
    formState: { errors },
  } = useFormContext<SwapData>();
  const tokenFieldName = `token${side}` as const;
  const otherTokenFieldName =
    `token${side === "Buy" ? "Sell" : "Buy"}` as const;
  const amountFieldName = `amount${side}` as const;

  const [isAmountDisabled, setIsAmountDisabled] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string>();
  const [usdPrice, setUsdPrice] = useState<number>();

  const [token, isSellOrder, amount] = useWatch({
    control,
    name: [tokenFieldName, "isSellOrder", amountFieldName],
  });

  const { updateOracle } = useSwapCardContext();
  const { getOrFetchTokenPrice, getTokenPairPrice } = useTokens();

  async function updateOtherSideAmount() {
    const limitPrice = getValues("limitPrice");
    if (!limitPrice) return;
    const [sellAmount, buyAmount] = calculateAmounts({
      isSellOrder,
      amount,
      limitPrice,
    });
    const anotherSideAmount = side === "Buy" ? sellAmount : buyAmount;
    setValue(
      `amount${side === "Buy" ? "Sell" : "Buy"}` as const,
      anotherSideAmount
    );
  }

  async function updateUsdPrice() {
    const usdPrice = await getOrFetchTokenPrice(token);
    setUsdPrice(usdPrice);
  }

  async function updateTokenBalance() {
    const balance = await fetchFormattedBalancerOf({
      token: token,
      address: safeAddress as Address,
      chainId: chainId as ChainId,
    });
    setTokenBalance(balance);
  }

  useEffect(() => {
    // Control if the amount field should be disabled
    setIsAmountDisabled(
      (isSellOrder && side === "Buy") || (!isSellOrder && side === "Sell")
    );
  }, [isSellOrder, side]);

  useEffect(() => {
    // Update token balance on token change
    if (token) {
      updateTokenBalance();
      updateUsdPrice();
    }
  }, [token, safeAddress]);

  useEffect(() => {
    // Update other side amount on amount change
    if (!isAmountDisabled) {
      updateOtherSideAmount();
    }
  }, [amount]);

  return (
    <Card className="bg-background text-foreground w-full p-2 rounded-md">
      <CardTitle className="w-full flex justify-between font-normal text-xs">
        {getCardTitle(isAmountDisabled, side)}
      </CardTitle>
      <CardContent className="flex justify-between gap-5 px-0 py-2 items-start">
        <div className="flex flex-col gap-y-1 w-full">
          <TokenSelect
            selectedToken={token}
            onSelectToken={(newToken) => {
              const otherToken = getValues(otherTokenFieldName);
              const tokenSell = side == "Sell" ? newToken : otherToken;
              const tokenBuy = side == "Sell" ? otherToken : newToken;
              if (otherToken) {
                getTokenPairPrice(tokenSell, tokenBuy)
                  .then((mkPrice) => {
                    setValue("marketPrice", mkPrice);
                  })
                  .catch(() => {
                    setValue("marketPrice", undefined);
                  });
                updateOracle({ tokenSell, tokenBuy });
              }
              setValue(tokenFieldName, newToken);
            }}
            errorMessage={errors[tokenFieldName]?.message}
          />
          {token && (
            <span className="text-xs text-foreground/70">
              <span>
                Balance:{" "}
                {formatNumber(
                  tokenBalance || "0",
                  4,
                  "decimal",
                  "standard",
                  0.0001
                )}{" "}
              </span>
              {!isAmountDisabled && tokenBalance && (
                <button
                  type="button"
                  className="text-accent outline-none hover:text-accent/70"
                  onClick={() => {
                    setValue(
                      amountFieldName,
                      convertStringToNumberAndRoundDown(tokenBalance)
                    );
                  }}
                >
                  Max
                </button>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-y-1 w-full items-end">
          <Input
            {...register(amountFieldName)}
            type="number"
            step={1 / 10 ** (token ? token.decimals : 18)}
            placeholder="0.0"
            className="w-full border-none shadow-none h-9 focus-visible:ring-transparent placeholder:text-foreground/70 px-0 text-2xl text-right bg-background"
            disabled={isAmountDisabled}
            min={0}
          />
          <i className="text-xs text-foreground/70">
            ${formatNumber(amount * (usdPrice || 0), 2)}
          </i>
        </div>
      </CardContent>
    </Card>
  );
}

export const TokenInputCard = memo(TokenInputCardComponent);

export function getCardTitle(isAmountDisabled: boolean, side: "Sell" | "Buy") {
  if (!isAmountDisabled) {
    return `${side} amount`;
  }
  if (side === "Buy") {
    return "Receive at least";
  } else {
    return "Sell at most";
  }
}
