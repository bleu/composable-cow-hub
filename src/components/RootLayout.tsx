import { Toaster } from "@bleu/ui";
import SafeProvider from "@safe-global/safe-apps-react-sdk";
import Link from "next/link";
import React from "react";

import { NetworksContextProvider } from "#/contexts/networks";
import { OrderProvider } from "#/contexts/ordersContext";
import { TokensContextProvider } from "#/contexts/tokensContext";

import { Footer } from "./Footer";
import { Header } from "./Header";

export function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <SafeProvider loader={<SafeLoader />}>
      <NetworksContextProvider>
        <TokensContextProvider>
          <OrderProvider>
            <div className="flex flex-col h-svh justify-between">
              <Header linkUrl={"/builder"} imageSrc={"/assets/stoploss.svg"} />
              <div className="size-full bg-background">{children}</div>
              <Footer
                githubLink="https://github.com/bleu-fi/composable-cow-hub"
                discordLink="https://discord.gg/cowprotocol"
              />
            </div>
            <Toaster />
          </OrderProvider>
        </TokensContextProvider>
      </NetworksContextProvider>
    </SafeProvider>
  );
}

function SafeLoader() {
  return (
    <div className="bg-background flex size-full flex-col justify-center items-center px-12 py-16 md:py-20 text-foreground">
      <div className="text-center text-3xl">This is a Safe (wallet) App</div>
      <p className="text-xl">
        To access please use this
        <Link
          target="_blank"
          href="https://app.safe.global/share/safe-app?appUrl=https%3A%2F%2Fcomposable-cow-hub.vercel.app&chain=gno"
          className="text-highlight"
        >
          {" "}
          link{" "}
        </Link>
        with your safe account connected
      </p>
    </div>
  );
}
