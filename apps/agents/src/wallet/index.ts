import type { AgentName } from "../types.js";

const OKX_BASE = "https://www.okx.com/api/v5/waas";

type WalletBalance = {
  accountId: string;
  address: string;
  balanceUsdc: string;
};

export async function getWalletBalance(
  accountId: string,
  address: string,
  apiKey: string,
): Promise<WalletBalance> {
  const res = await fetch(`${OKX_BASE}/asset/token-assets?accountId=${accountId}&chainIndex=196`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Wallet balance fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as { data: Array<{ tokenSymbol: string; balance: string }> };
  const usdc = json.data.find((t) => t.tokenSymbol === "USDC");

  return {
    accountId,
    address,
    balanceUsdc: usdc?.balance ?? "0",
  };
}

export async function getAllBalances(
  wallets: Record<AgentName, { accountId: string; address: string }>,
  apiKey: string,
): Promise<Record<AgentName, string>> {
  const entries = await Promise.all(
    (Object.entries(wallets) as [AgentName, { accountId: string; address: string }][]).map(
      async ([name, wallet]) => {
        const balance = await getWalletBalance(wallet.accountId, wallet.address, apiKey);
        return [name, balance.balanceUsdc] as const;
      },
    ),
  );
  return Object.fromEntries(entries) as Record<AgentName, string>;
}
