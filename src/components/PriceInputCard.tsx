import { Card, CardContent, CardTitle, formatNumber, Input } from "@bleu/ui";
import { memo, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { calculateAmounts } from "#/lib/calculateAmounts";
import { SwapData } from "#/lib/types";

export const PriceInputCard = memo(PriceInputCardComponent);

function PriceInputCardComponent({
  fieldName,
  showMarketPrice = false,
}: {
  fieldName: "limitPrice" | "strikePrice";
  showMarketPrice?: boolean;
}) {
  const { register, control, getValues, setValue } = useFormContext<SwapData>();
  const title = fieldName === "limitPrice" ? "Limit price" : "Trigger price";

  const [tokenBuy, tokenSell, price, marketPrice] = useWatch({
    control,
    name: ["tokenBuy", "tokenSell", fieldName, "marketPrice"],
  });

  async function updateDisabledAmount() {
    const isSellOrder = getValues("isSellOrder");
    const referenceAmount = getValues(isSellOrder ? "amountSell" : "amountBuy");
    if (!referenceAmount) return;
    const [sellAmount, buyAmount] = calculateAmounts({
      isSellOrder,
      amount: referenceAmount,
      limitPrice: price,
    });
    setValue(
      isSellOrder ? "amountBuy" : "amountSell",
      isSellOrder ? buyAmount : sellAmount
    );
  }

  useEffect(() => {
    if (fieldName === "limitPrice") {
      updateDisabledAmount();
    }
  }, [price]);

  return (
    <Card className="bg-background text-foreground w-full p-2 rounded-md">
      <CardTitle>
        <div className="flex justify-between font-normal text-xs">
          <span>{title}</span>
          {marketPrice && (
            <button
              className="text-accent hover:text-accent/80"
              type="button"
              onClick={() => {
                setValue(fieldName, marketPrice);
              }}
            >
              Set to market
            </button>
          )}
        </div>
      </CardTitle>
      <CardContent className="flex flex-col gap-2 px-0 py-2 items-start">
        <div className="flex justify-between items-center gap-5">
          <Input
            {...register(fieldName)}
            type="number"
            step={1 / 10 ** 18}
            placeholder="0.0"
            className="w-full border-none shadow-none h-9 focus-visible:ring-transparent placeholder:text-foreground/70 px-0 text-2xl"
            min={0}
          />
          {tokenBuy && tokenBuy && <span>{tokenBuy.symbol}</span>}
        </div>
        {showMarketPrice && marketPrice && (
          <div className="flex flex-col items-start justify-between font-normal text-foreground/70">
            <span className="text-xs">
              Current: {tokenSell.symbol} = {formatNumber(marketPrice, 2)}{" "}
              {tokenBuy.symbol}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
