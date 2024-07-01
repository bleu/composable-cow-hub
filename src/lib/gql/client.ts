import { ChainId } from "#/lib/publicClients";
import { SUBGRAPHS, Subgraph } from "codegen";
import { GraphQLClient } from "graphql-request";
import composableCowSdk from "./composable-cow";

const clientFor = (client: Subgraph) => (chainId: ChainId) => {
  const endpoint = SUBGRAPHS[client].endpointFor(chainId);
  return new GraphQLClient(endpoint);
};

export const composableCowApi = {
  client: clientFor(Subgraph.ComposableCow),
  gql: (chainId: ChainId) =>
    composableCowSdk[chainId](composableCowApi.client(chainId)),
};
