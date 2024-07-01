// @ts-ignore
import parsePrometeusText from "parse-prometheus-text-format";
import useSWR from "swr";

import { networkFor } from "#/utils";

const METRICS_URL = "https://composable-cow-api.up.railway.app/metrics";

export async function getBlockNumberFromPrometheusMetrics(chainId: number) {
  const rawMetricsData = await fetch(METRICS_URL).then((res) => res.text());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics = parsePrometeusText(rawMetricsData) as Record<string, any>;

  const latestBlockNumber = Object.values(metrics)
    .find(({ name }) => name === "ponder_realtime_latest_block_number")
    ?.["metrics"]?.find(
      // @ts-ignore
      ({ labels }) => labels.network === networkFor(chainId)
    )?.value;

  if (!latestBlockNumber) return undefined;

  return Number(latestBlockNumber);
}
