import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";
import { TransactionStatus } from "@safe-global/safe-apps-sdk";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

import { getBlockNumberFromPrometheusMetrics } from "#/lib/ponderApi";
import { ChainId, publicClientsFromIds } from "#/lib/publicClients";
import {
  AllTransactionArgs,
  TransactionFactory,
} from "#/lib/transactionFactory";

export function useTxManager() {
  const {
    sdk,
    safe: { chainId },
  } = useSafeAppsSDK();

  const publicClient = publicClientsFromIds[chainId as ChainId];
  const sendTransactions = async (argsArray: AllTransactionArgs[]) => {
    const txs = await Promise.all(
      argsArray.map((arg) => {
        return TransactionFactory.createRawTx(arg.type, arg);
      })
    );
    const { safeTxHash } = await sdk.txs.send({ txs });
    return safeTxHash as `0x${string}`;
  };

  const getTransactionBlockNumber = async (txHash?: `0x${string}`) => {
    if (!txHash) return;
    const transaction = await publicClient.getTransaction({ hash: txHash });
    return transaction.blockNumber;
  };

  const {
    data: txHash,
    mutate: writeContract,
    isPending: isWriting,
  } = useMutation({
    mutationFn: (txs: AllTransactionArgs[]) => {
      return sendTransactions(txs);
    },
    mutationKey: ["writeContract"],
  });

  const { data: isTxProcessed, mutateAsync: mutateIsTxProcessed } = useMutation(
    {
      mutationFn: async (safeTxHash: string) => {
        const safeTx = await sdk.txs.getBySafeTxHash(safeTxHash);
        if (!safeTx) return true;
        if (
          [TransactionStatus.CANCELLED, TransactionStatus.FAILED].includes(
            safeTx?.txStatus
          )
        )
          return true;
        if (
          [
            TransactionStatus.AWAITING_CONFIRMATIONS,
            TransactionStatus.AWAITING_EXECUTION,
          ].includes(safeTx?.txStatus) ||
          !safeTx.txHash
        )
          return false;
        const [txBlockNumber, ponderBlockNumber] = await Promise.all([
          getTransactionBlockNumber(safeTx.txHash as `0x${string}`),
          getBlockNumberFromPrometheusMetrics(chainId),
        ]);
        if (!txBlockNumber || !ponderBlockNumber) return false;
        return txBlockNumber < ponderBlockNumber;
      },
      mutationKey: ["getSafeTx"],
    }
  );

  useEffect(() => {
    if (txHash) {
      mutateIsTxProcessed(txHash);
    }
  }, [txHash]);

  useEffect(() => {
    if (txHash && !isTxProcessed) {
      const interval = setInterval(() => {
        mutateIsTxProcessed(txHash);
      }, 5_000);
      return () => clearInterval(interval);
    }
  }, [txHash, isTxProcessed]);

  return {
    writeContract,
    txHash,
    isWriting,
    isPonderUpdating: !isTxProcessed && !!txHash,
  };
}
