import { Controller, UseFormReturn } from "react-hook-form";
import { formatUnits } from "viem";

import { useSafeBalances } from "#/hooks/useSafeBalances";
import { ISwapData, TIME_OPTIONS } from "#/lib/types";
import { convertAndRoundDown, formatNumber } from "#/lib/utils";

import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import { Select, SelectItem } from "../Select";
import { TokenSelect } from "../TokenSelect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export function SwapMenu({
  data,
  form,
}: {
  data: ISwapData;
  form: UseFormReturn;
}) {
  const { fetchBalance } = useSafeBalances();
  const { control, watch, setValue } = form;

  const formData = watch();

  const amountDecimals = formData.isSellOrder
    ? formData.tokenSell.decimals
    : formData.tokenBuy.decimals;
  const amountAddress = formData.isSellOrder
    ? formData.tokenSell.address
    : formData.tokenBuy.address;

  const walletAmount = formatUnits(
    BigInt(fetchBalance(amountAddress || "")),
    amountDecimals
  );

  return (
    <div>
      <span className="text-md font-bold mb-3">Swap</span>
      <div className="flex flex-col gap-y-2">
        <div className="flex flex-col gap-y-1">
          <Input
            name="amount"
            label={`Amount to ${formData.isSellOrder ? "sell" : "buy"}`}
            type="number"
            step={1 / 10 ** amountDecimals}
          />
          <div className="flex gap-x-1 text-xs">
            <span className="text-slate10">
              <span>
                Wallet Balance:{" "}
                {formatNumber(walletAmount, 4, "decimal", "standard", 0.0001)}
              </span>
            </span>
            <button
              type="button"
              className="text-blue9 outline-none hover:text-amber9"
              onClick={() => {
                setValue("amount", convertAndRoundDown(walletAmount));
              }}
            >
              Max
            </button>
          </div>
        </div>
        <TokenSelect
          selectedToken={data.tokenSell}
          tokenType="sell"
          onSelectToken={(newToken) => {
            setValue("tokenSell", newToken);
          }}
        />
        <TokenSelect
          selectedToken={data.tokenBuy}
          tokenType="buy"
          onSelectToken={(newToken) => {
            setValue("tokenBuy", newToken);
          }}
        />
        <Accordion className="w-full" type="single" collapsible>
          <AccordionItem value="advancedOptions" key="advancedOption">
            <AccordionTrigger>Advanced Options</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-y-2 mx-2">
                <Input
                  name="allowedSlippage"
                  label={`Allowed Slippage (%)`}
                  type="number"
                />
                <Input name="receiver" label="Receiver" />
                <Checkbox
                  id="isPartiallyFillable"
                  checked={formData.isPartiallyFillable}
                  label="Is Partially Fillable"
                  onChange={() =>
                    setValue(
                      "isPartiallyFillable",
                      !formData.isPartiallyFillable
                    )
                  }
                />
                <Checkbox
                  id="isSellOrder"
                  checked={formData.isSellOrder}
                  label="Is Sell Order"
                  onChange={() =>
                    setValue("isSellOrder", !formData.isSellOrder)
                  }
                />
                <div className="flex flex-col">
                  <label className="mb-2 block text-sm text-slate12">
                    Validity Bucket Time
                  </label>
                  <Controller
                    control={control}
                    name="validityBucketTime"
                    render={({ field: { onChange, value, ref } }) => (
                      <Select onValueChange={onChange} value={value} ref={ref}>
                        {Object.entries(TIME_OPTIONS).map(([key, value]) => (
                          <SelectItem key={key} value={String(value)}>
                            {key}
                          </SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
