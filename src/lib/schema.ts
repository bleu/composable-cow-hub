import { Address, isAddress } from "viem";
import { z } from "zod";
import { normalize } from "viem/ens";

import { ChainId, publicClientsFromIds } from "./publicClients";
import { fetchCowQuote } from "./cowApi/fetchCowQuote";
import { oracleMinimalAbi } from "./abis/oracleMinimalAbi";
import { capitalize } from "@bleu/ui";

const basicAddressSchema = z.custom<Address>((val) => {
  return typeof val === "string" ? isAddress(val) : false;
});

const basicTokenSchema = z.object({
  address: basicAddressSchema,
  decimals: z.number().positive(),
  symbol: z.string(),
});

const ensSchema = z
  .string()
  .min(1)
  .refine((value) => value.includes(".eth"), {
    message: "Provided address is invalid",
  })
  .transform(async (value) => {
    const publicClient = publicClientsFromIds[1];
    return (await publicClient.getEnsAddress({
      name: normalize(value),
    })) as Address;
  })
  .refine((value) => isAddress(value), {
    message: "Provided address is invalid",
  });

const generateOracleSchema = ({ chainId }: { chainId: ChainId }) => {
  const publicClient = publicClientsFromIds[chainId];
  return basicAddressSchema.refine(
    async (value) => {
      return publicClient
        .readContract({
          address: value as Address,
          abi: oracleMinimalAbi,
          functionName: "latestRoundData",
        })
        .then(() => true)
        .catch(() => false);
    },
    {
      message: "Oracle contract not found",
    }
  );
};

export const generateSwapSchema = (chainId: ChainId) =>
  z
    .object({
      tokenSell: basicTokenSchema,
      tokenBuy: basicTokenSchema,
      amountSell: z.coerce.number().positive(),
      amountBuy: z.coerce.number().positive(),
      strikePrice: z.coerce.number().positive(),
      limitPrice: z.coerce.number().positive(),
      marketPrice: z.optional(z.number().positive()),
      isSellOrder: z.coerce.boolean(),
    })
    .refine(
      (data) => {
        return data.tokenSell.address != data.tokenBuy.address;
      },
      {
        path: ["tokenBuy"],
        message: "Tokens sell and buy must be different",
      }
    )
    .refine(
      (data) => {
        return !data.marketPrice || data.marketPrice > data.strikePrice;
      },
      {
        path: ["strikePrice"],
        message: "Strike price must be less than current market price",
      }
    )
    .superRefine((data, ctx) => {
      const amountDecimals = data.isSellOrder
        ? data.tokenSell.decimals
        : data.tokenBuy.decimals;
      const amount = data.isSellOrder ? data.amountSell : data.amountBuy;
      return fetchCowQuote({
        tokenIn: data.tokenSell,
        tokenOut: data.tokenBuy,
        amount: amount * 10 ** amountDecimals,
        chainId,
        priceQuality: "fast",
        isSell: data.isSellOrder,
      }).then((res) => {
        if (res.errorType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${res.errorType}: ${capitalize(res.description)}`,
          });
        }
      });
    });

export const generateAdvancedSettingsSchema = (chainId: ChainId) =>
  z
    .object({
      maxHoursSinceOracleUpdates: z.coerce.number().positive(),
      tokenSellOracle: z.union([
        generateOracleSchema({ chainId }),
        z.literal(""),
      ]),
      tokenBuyOracle: z.union([
        generateOracleSchema({ chainId }),
        z.literal(""),
      ]),
      receiver: z.union([basicAddressSchema, ensSchema]),
      partiallyFillable: z.coerce.boolean(),
    })
    .refine(
      (data) => {
        if (!data.tokenSellOracle && data.tokenBuyOracle) {
          return false;
        }
        return true;
      },
      {
        message: "If one oracle is set, both must be set",
        path: ["tokenSellOracle"],
      }
    )
    .refine(
      (data) => {
        if (!data.tokenBuyOracle && data.tokenSellOracle) {
          return false;
        }
        return true;
      },
      {
        message: "If one oracle is set, both must be set",
        path: ["tokenBuyOracle"],
      }
    );
