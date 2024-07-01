import { Address, erc20Abi, formatUnits, parseUnits } from "viem";

import { getCoingeckoUsdPrice } from "./coingeckoApi";
import { ChainId, publicClientsFromIds } from "./publicClients";
import { getCowProtocolUsdPrice } from "./cowApi/fetchNativePrice";
import { IToken } from "./types";

export async function fetchPairUsdPrice({
  sellToken,
  buyToken,
  chainId,
}: {
  sellToken: IToken;
  buyToken: IToken;
  chainId: ChainId;
}): Promise<number> {
  const [sellTokenUsdPrice, buyTokenUsdPrice] = await Promise.all([
    fetchTokenUsdPrice({
      tokenAddress: sellToken.address,
      tokenDecimals: sellToken.decimals,
      chainId: chainId,
    }),
    fetchTokenUsdPrice({
      tokenAddress: buyToken.address,
      tokenDecimals: buyToken.decimals,
      chainId: chainId,
    }),
  ]);
  return sellTokenUsdPrice / buyTokenUsdPrice;
}

/**
 * Fetches USD price for a given currency from coingecko or CowProtocol
 * CoW Protocol Orderbook API is used as a fallback
 * When Coingecko rate limit is hit, CowProtocol will be used for 1 minute
 */
export async function fetchTokenUsdPrice({
  tokenAddress,
  tokenDecimals,
  chainId,
}: {
  tokenAddress: Address;
  tokenDecimals: number;
  chainId: ChainId;
}): Promise<number> {
  try {
    const coingeckoPrice = await getCoingeckoUsdPrice({
      chainId,
      address: tokenAddress,
    });
    return coingeckoPrice;
  } catch {
    const cowPrice = await getCowProtocolUsdPrice({
      chainId,
      tokenAddress,
      tokenDecimals,
    });
    return cowPrice;
  }
}

export async function fetchFormattedBalancerOf({
  token,
  address,
  chainId,
}: {
  token: IToken;
  address: Address;
  chainId: ChainId;
}): Promise<string> {
  const publicClient = publicClientsFromIds[chainId];
  const bigIntBalance = await publicClient.readContract({
    abi: erc20Abi,
    address: token.address as Address,
    functionName: "balanceOf",
    args: [address],
    blockTag: "latest",
  });
  return formatUnits(bigIntBalance, token.decimals);
}

export async function fetchTokenInfo(
  tokenAddress: Address,
  chainId: ChainId
): Promise<IToken> {
  const publicClient = publicClientsFromIds[chainId];
  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);
  return {
    address: tokenAddress as Address,
    decimals,
    symbol,
  };
}

export const getNewMinTradeToken0 = async (
  newToken0: IToken,
  chainId: ChainId
) => {
  return fetchTokenUsdPrice({
    tokenAddress: newToken0.address as Address,
    tokenDecimals: newToken0.decimals,
    chainId,
  })
    .then((price) => 10 / price)
    .then((amount) =>
      // Format and parse to round on the right number of decimals
      Number(
        formatUnits(
          parseUnits(String(amount), newToken0.decimals),
          newToken0.decimals
        )
      )
    )
    .catch(() => 0);
};
