import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  toast,
} from "@bleu/ui";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import React, { useState } from "react";
import { Address, isAddress } from "viem";

import { useTokens } from "#/contexts/tokensContext";
import { fetchTokenInfo } from "#/lib/fetchTokenInfo";
import { ChainId } from "#/lib/publicClients";
import { IToken } from "#/lib/types";

import { TokenInfo } from "./TokenInfo";

export function TokenSelect({
  onSelectToken,
  selectedToken,
  disabled = false,
  errorMessage,
}: {
  onSelectToken: (token: IToken) => void;
  selectedToken?: IToken;
  disabled?: boolean;
  errorMessage?: string;
}) {
  const {
    safe: { chainId },
  } = useSafeAppsSDK();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { getTokenList, addImportedToken } = useTokens();

  function handleSelectToken(token: IToken) {
    onSelectToken(token);
    setOpen(false);
  }

  async function handleImportToken() {
    try {
      const importedToken = await fetchTokenInfo(
        search as Address,
        chainId as ChainId
      );
      handleSelectToken(importedToken);
      addImportedToken(importedToken);
      toast({
        title: "Token imported",
      });
    } catch (e) {
      toast({
        title: "Error importing token",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              type="button"
              className="px-2 justify-between bg-foreground text-background rounded-md"
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                selectedToken ? (
                  <TokenInfo token={selectedToken} showExplorerLink={false} />
                ) : (
                  "Select Token"
                )
              }
              {!disabled && <ChevronDownIcon />}
            </Button>
            {errorMessage && (
              <div className="mt-1 text-sm text-destructive">
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent>
          {/* @ts-ignore */}
          <Command
            filter={(value: string, search: string) => {
              setSearch(search);
              if (!search) return 1;
              const regex = new RegExp(search, "i");
              return Number(regex.test(value));
            }}
            value={selectedToken?.symbol}
          >
            <CommandInput />
            {/* @ts-ignore */}
            <CommandList>
              {/* @ts-ignore */}
              <CommandEmpty onSelect={handleImportToken}>
                No results found
              </CommandEmpty>
              {getTokenList().map((token) => (
                // @ts-ignore
                <CommandItem
                  key={token.address}
                  value={token.symbol + token.address}
                  onSelect={() => handleSelectToken(token)}
                >
                  <TokenInfo
                    token={{
                      address: token.address as Address,
                      symbol: token.symbol,
                      decimals: token.decimals,
                    }}
                    showExplorerLink={false}
                  />
                </CommandItem>
              ))}
              {isAddress(search) && (
                // @ts-ignore
                <CommandItem
                  key={search}
                  value={search}
                  onSelect={handleImportToken}
                >
                  Import token
                </CommandItem>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
