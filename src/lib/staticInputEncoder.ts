import { encodeAbiParameters, parseUnits } from "viem";

import { MetadataApi } from "@cowprotocol/app-data";
import { uploadAppData } from "./cowApi/uploadAppData";
import { StopLossOrderArgs } from "./transactionFactory";

export const stopLossDataStructure = [
  {
    name: "sellToken",
    type: "address",
  },
  {
    name: "buyToken",
    type: "address",
  },
  {
    name: "sellAmount",
    type: "uint256",
  },
  {
    name: "buyAmount",
    type: "uint256",
  },
  {
    name: "appData",
    type: "bytes32",
  },
  {
    name: "receiver",
    type: "address",
  },
  {
    name: "isSellOrder",
    type: "bool",
  },
  {
    name: "isPartiallyFillable",
    type: "bool",
  },
  {
    name: "validityBucketSeconds",
    type: "uint32",
  },
  {
    name: "sellTokenPriceOracle",
    type: "address",
  },
  {
    name: "buyTokenPriceOracle",
    type: "address",
  },
  {
    name: "strike",
    type: "int256",
  },
  {
    name: "maxTimeSinceLastOracleUpdate",
    type: "uint32",
  },
];

export async function stopLossArgsEncoder(
  data: StopLossOrderArgs,
  salt: `0x${string}`
): Promise<`0x${string}`> {
  const metadataApi = new MetadataApi();

  const appDataDoc = await metadataApi.generateAppDataDoc({
    metadata: {
      widget: {
        appCode: "Stop Loss",
        ponderId: `${salt}-${data.safeAddress}-${data.chainId}`,
      },
    },
  });
  const { appDataHex, appDataContent } =
    await metadataApi.appDataToCid(appDataDoc);
  await uploadAppData({
    fullAppData: appDataContent,
    appDataHex,
    chainId: data.chainId,
  });

  const strikePriceWithDecimals = parseUnits(String(data.strikePrice), 18);
  const sellAmountWithDecimals = parseUnits(
    String(data.amountSell),
    data.tokenSell.decimals
  );
  const buyAmountWithDecimals = parseUnits(
    String(data.amountBuy),
    data.tokenBuy.decimals
  );

  const validityBucketSeconds = 24 * 60 * 60;

  return encodeAbiParameters(stopLossDataStructure, [
    data.tokenSell.address,
    data.tokenBuy.address,
    sellAmountWithDecimals,
    buyAmountWithDecimals,
    appDataHex,
    data.receiver,
    data.isSellOrder,
    data.partiallyFillable,
    validityBucketSeconds.toFixed(),
    data.tokenSellOracle,
    data.tokenBuyOracle,
    strikePriceWithDecimals,
    (data.maxHoursSinceOracleUpdates * 60).toFixed(),
  ]);
}
