import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { xlayer } from "@helios/shared/chains";

const REGISTRY_ABI = parseAbi([
  "function logCycle(string calldata action, string calldata txHashes) external",
  "function registerAgent(address wallet, uint8 role) external",
]);

/**
 * Log a completed cycle to HeliosRegistry.sol on X Layer.
 * Requires HELIOS_REGISTRY_ADDRESS and CURATOR_PRIVATE_KEY env vars.
 * No-ops silently if either is missing (pre-deployment).
 */
export async function logCycleOnChain(opts: {
  action: string;
  txHashes: string[];
}): Promise<string | null> {
  const registryAddress = process.env.HELIOS_REGISTRY_ADDRESS as `0x${string}` | undefined;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

  if (!registryAddress || !privateKey) return null;

  try {
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: xlayer,
      transport: http(process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech"),
    });

    const txHash = await client.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: "logCycle",
      args: [opts.action, opts.txHashes.join(",")],
    });

    return txHash;
  } catch (err) {
    console.warn("[Registry] logCycle failed (non-fatal):", err);
    return null;
  }
}
