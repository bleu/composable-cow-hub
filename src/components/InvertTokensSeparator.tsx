import { Separator } from "@bleu/ui";
import { UpdateIcon } from "@radix-ui/react-icons";
import { memo } from "react";
import { useFormContext } from "react-hook-form";

import { SwapData } from "#/lib/types";

export const InvertTokensSeparator = memo(InvertTokensSeparatorComponent);

function InvertTokensSeparatorComponent() {
  const { getValues, setValue } = useFormContext<SwapData>();

  function invertTokens() {
    const [
      tokenBuy,
      tokenSell,
      amountBuy,
      amountSell,
      limitPrice,
      strikePrice,
      marketPrice,
    ] = getValues([
      "tokenBuy",
      "tokenSell",
      "amountBuy",
      "amountSell",
      "limitPrice",
      "strikePrice",
      "marketPrice",
    ]);
    setValue("tokenBuy", tokenSell);
    setValue("tokenSell", tokenBuy);
    setValue("amountBuy", amountSell);
    setValue("amountSell", amountBuy);
    if (limitPrice) setValue("limitPrice", 1 / limitPrice);
    if (strikePrice) setValue("strikePrice", 1 / strikePrice);
    if (marketPrice) setValue("marketPrice", 1 / marketPrice);
  }

  return (
    <div className="flex w-full gap-1 items-center">
      <div className="w-2/5">
        <Separator />
      </div>
      <button
        className="flex justify-center w-1/5"
        type="button"
        onClick={invertTokens}
      >
        <UpdateIcon className="size-6 text-accent hover:text-accent/70" />
      </button>
      <div className="w-2/5">
        <Separator />
      </div>
    </div>
  );
}
