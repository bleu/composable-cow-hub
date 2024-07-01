import { BaseTransaction } from "@safe-global/safe-apps-sdk";
import { Address, encodeFunctionData, erc20Abi, parseUnits } from "viem";

import { composableCowAbi } from "./abis/composableCow";
import { signatureVerifierMuxerAbi } from "./abis/signatureVerifierMuxer";
import { stopLossArgsEncoder } from "./staticInputEncoder";
import { DraftOrder, IToken } from "./types";
import {
  COMPOSABLE_COW_ADDRESS,
  EXTENSIBLE_FALLBACK_ADDRESS,
  STOP_LOSS_ADDRESS,
} from "./contracts";
import { FALLBACK_STATES } from "#/hooks/useFallbackState";
import { ChainId } from "./publicClients";

export enum TRANSACTION_TYPES {
  ERC20_APPROVE = "ERC20_APPROVE",
  STOP_LOSS_ORDER = "STOP_LOSS_ORDER",
  SET_FALLBACK_HANDLER = "SET_FALLBACK_HANDLER",
  SET_DOMAIN_VERIFIER = "SET_DOMAIN_VERIFIER",
  ORDER_CANCEL = "ORDER_CANCEL",
}

export interface BaseArgs {
  type: TRANSACTION_TYPES;
}

export interface ERC20ApproveArgs extends BaseArgs {
  type: TRANSACTION_TYPES.ERC20_APPROVE;
  token: IToken;
  spender: Address;
  amount: number;
}

export interface StopLossOrderArgs extends BaseArgs, DraftOrder {
  type: TRANSACTION_TYPES.STOP_LOSS_ORDER;
  chainId: ChainId;
  safeAddress: Address;
}

export interface setFallbackHandlerArgs extends BaseArgs {
  safeAddress: Address;
}

export interface setDomainVerifierArgs extends BaseArgs {
  safeAddress: Address;
  domainSeparator: Address;
}

export interface OrderCancelArgs extends BaseArgs {
  type: TRANSACTION_TYPES.ORDER_CANCEL;
  hash: Address;
}

interface ITransaction<T> {
  createRawTx(args: T): Promise<BaseTransaction>;
}

class ERC20ApproveRawTx implements ITransaction<ERC20ApproveArgs> {
  async createRawTx({
    token,
    spender,
    amount,
  }: ERC20ApproveArgs): Promise<BaseTransaction> {
    const amountBigInt = parseUnits(String(amount), 18);
    return {
      to: token.address,
      value: "0",
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amountBigInt],
      }),
    };
  }
}

class StopLossOrderTx implements ITransaction<StopLossOrderArgs> {
  async createRawTx(data: StopLossOrderArgs): Promise<BaseTransaction> {
    const saltPadEnd = [...Array(4)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("");

    const salt =
      `0x${Date.now().toString(16).padEnd(64, saltPadEnd)}` as Address;
    return {
      to: COMPOSABLE_COW_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: composableCowAbi,
        functionName: "create",
        args: [
          {
            handler: STOP_LOSS_ADDRESS[data.chainId],
            salt: salt,
            staticInput: await stopLossArgsEncoder(data, salt),
          },
          true,
        ],
      }),
    };
  }
}

class FallbackHandlerSetupTx implements ITransaction<setFallbackHandlerArgs> {
  async createRawTx({
    safeAddress,
  }: setFallbackHandlerArgs): Promise<BaseTransaction> {
    return {
      to: safeAddress,
      value: "0",
      data: encodeFunctionData({
        abi: signatureVerifierMuxerAbi,
        functionName: "setFallbackHandler",
        args: [EXTENSIBLE_FALLBACK_ADDRESS],
      }),
    };
  }
}

class DomainVerifierSetupTx implements ITransaction<setDomainVerifierArgs> {
  async createRawTx({
    safeAddress,
    domainSeparator,
  }: setDomainVerifierArgs): Promise<BaseTransaction> {
    return {
      to: safeAddress,
      value: "0",
      data: encodeFunctionData({
        abi: signatureVerifierMuxerAbi,
        functionName: "setDomainVerifier",
        args: [domainSeparator, COMPOSABLE_COW_ADDRESS],
      }),
    };
  }
}

class OrderCancelTx implements ITransaction<OrderCancelArgs> {
  async createRawTx({ hash }: OrderCancelArgs): Promise<BaseTransaction> {
    return {
      to: COMPOSABLE_COW_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: composableCowAbi,
        functionName: "remove",
        args: [hash],
      }),
    };
  }
}

export interface TransactionBindings {
  [TRANSACTION_TYPES.ERC20_APPROVE]: ERC20ApproveArgs;
  [TRANSACTION_TYPES.STOP_LOSS_ORDER]: StopLossOrderArgs;
  [TRANSACTION_TYPES.SET_FALLBACK_HANDLER]: setFallbackHandlerArgs;
  [TRANSACTION_TYPES.SET_DOMAIN_VERIFIER]: setDomainVerifierArgs;
  [TRANSACTION_TYPES.ORDER_CANCEL]: OrderCancelArgs;
}

export type AllTransactionArgs = TransactionBindings[keyof TransactionBindings];

const TRANSACTION_CREATORS: {
  [key in keyof TransactionBindings]: new () => ITransaction<
    TransactionBindings[key]
  >;
} = {
  [TRANSACTION_TYPES.ERC20_APPROVE]: ERC20ApproveRawTx,
  [TRANSACTION_TYPES.STOP_LOSS_ORDER]: StopLossOrderTx,
  [TRANSACTION_TYPES.SET_FALLBACK_HANDLER]: FallbackHandlerSetupTx,
  [TRANSACTION_TYPES.SET_DOMAIN_VERIFIER]: DomainVerifierSetupTx,
  [TRANSACTION_TYPES.ORDER_CANCEL]: OrderCancelTx,
};

export class TransactionFactory {
  static async createRawTx<T extends TRANSACTION_TYPES>(
    type: T,
    args: TransactionBindings[T]
  ): Promise<BaseTransaction> {
    const TransactionCreator = TRANSACTION_CREATORS[type];
    const txCreator = new TransactionCreator();
    return txCreator.createRawTx(args);
  }
}

export async function createRawTxArgs({
  data,
  safeAddress,
  domainSeparator,
  fallbackState,
  chainId,
}: {
  data: DraftOrder[];
  safeAddress: Address;
  domainSeparator: Address;
  fallbackState: FALLBACK_STATES;
  chainId: ChainId;
}): Promise<AllTransactionArgs[]> {
  const setFallbackTx = {
    type: TRANSACTION_TYPES.SET_FALLBACK_HANDLER,
    safeAddress,
  } as setFallbackHandlerArgs;
  const DomainVerifierSetupTx = {
    type: TRANSACTION_TYPES.SET_DOMAIN_VERIFIER,
    safeAddress,
    domainSeparator,
  } as setDomainVerifierArgs;

  const setupTxs = (() => {
    switch (fallbackState) {
      case FALLBACK_STATES.HAS_NOTHING:
        return [setFallbackTx, DomainVerifierSetupTx];
      case FALLBACK_STATES.HAS_EXTENSIBLE_FALLBACK:
        return [DomainVerifierSetupTx];
      default:
        return [];
    }
  })();

  const uniqueTokenSell = new Set(data.map((order) => order.tokenSell.address));

  const approveTxs = Array.from(uniqueTokenSell).map((tokenAddress) => {
    const ordersWithSameTokenSell = data.filter(
      (order) => order.tokenSell.address === tokenAddress
    );
    const token = ordersWithSameTokenSell[0].tokenSell;
    const totalAmount = ordersWithSameTokenSell.reduce(
      (acc, order) => acc + order.amountSell,
      0
    );
    return {
      type: TRANSACTION_TYPES.ERC20_APPROVE,
      token,
      spender: COMPOSABLE_COW_ADDRESS,
      amount: totalAmount,
    } as ERC20ApproveArgs;
  });

  const ordersTxs = await Promise.all(
    data.map((order) => ({
      type: TRANSACTION_TYPES.STOP_LOSS_ORDER,
      ...order,
      chainId,
      safeAddress,
    }))
  );

  return [...setupTxs, ...approveTxs, ...ordersTxs];
}
