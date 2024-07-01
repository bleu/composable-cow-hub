"use client";

import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import React from "react";

import { cowTokenList } from "#/lib/cowTokenList";
import { ChainId } from "#/lib/publicClients";
import { fetchTokenUsdPrice } from "#/lib/tokenUtils";
import { IToken } from "#/lib/types";

interface ITokenWithChainId extends IToken {
  chainId: ChainId;
}

interface ITokensContext {
  getTokenList: () => IToken[];
  addImportedToken: (token: IToken) => void;
  getTokenPairPrice: (tokenSell: IToken, tokenBuy: IToken) => Promise<number>;
  getOrFetchTokenPrice: (token: IToken) => Promise<number>;
}

export const TokensContext = React.createContext<ITokensContext>(
  {} as ITokensContext
);

function fetchFromLocalStorage<T>(key: string): T | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const item = localStorage.getItem(key) as string;
  if (!item) return null;

  return JSON.parse(item);
}

export const TokensContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  if (typeof window === "undefined" || !window.localStorage) return;

  const {
    safe: { chainId },
  } = useSafeAppsSDK();

  const [importedTokenList, setImportedTokenList] = React.useState<
    ITokenWithChainId[]
  >(fetchFromLocalStorage("importedTokens") || []);
  const [tokenPricesMapping, setTokenPricesMapping] =
    React.useState<Record<string, number>>();

  function getTokenList() {
    return [
      ...(cowTokenList.filter(
        (token) => token.chainId === chainId
      ) as IToken[]),
      ...importedTokenList,
    ];
  }

  async function getOrFetchTokenPrice(token: IToken) {
    if (tokenPricesMapping?.[token.address]) {
      return tokenPricesMapping[token.address];
    }
    const tokenPrice = await fetchTokenUsdPrice({
      tokenAddress: token.address,
      tokenDecimals: token.decimals,
      chainId: chainId as ChainId,
    });

    setTokenPricesMapping({
      ...tokenPricesMapping,
      [token.address]: tokenPrice,
    });

    return tokenPrice;
  }

  async function getTokenPairPrice(tokenSell: IToken, tokenBuy: IToken) {
    return Promise.all([
      getOrFetchTokenPrice(tokenSell),
      getOrFetchTokenPrice(tokenBuy),
    ]).then(([sellPrice, buyPrice]) => {
      return sellPrice / buyPrice;
    });
  }

  function addImportedToken(token: IToken) {
    const newImportedTokenList = [
      ...importedTokenList,
      { ...token, chainId: chainId as ChainId },
    ];
    setImportedTokenList(newImportedTokenList);
    localStorage.setItem(
      "importedTokens",
      JSON.stringify(newImportedTokenList)
    );
  }

  return (
    <TokensContext.Provider
      value={{
        getTokenList,
        addImportedToken,
        getTokenPairPrice,
        getOrFetchTokenPrice,
      }}
    >
      {children}
    </TokensContext.Provider>
  );
};

export const useTokens = () => React.useContext(TokensContext);
