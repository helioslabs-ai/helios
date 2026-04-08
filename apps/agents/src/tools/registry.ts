import type { Tool } from "ai";

import { okxDexSignal, okxSmartMoneyTracker } from "./okx-dex-signal.js";
import { okxTokenHotTokens, okxTokenAdvancedInfo, okxTokenPriceInfo } from "./okx-dex-token.js";
import { okxMarketPrice, okxMarketKline } from "./okx-dex-market.js";
import { okxDexTrenches } from "./okx-dex-trenches.js";
import { okxSecurityTokenScan } from "./okx-security.js";
import { okxDefiSearch, okxDefiInvest, okxDefiCollect } from "./okx-defi-invest.js";
import { okxDefiPositions } from "./okx-defi-portfolio.js";
import { okxSwapQuote, okxSwapExecute } from "./okx-dex-swap.js";
import { okxGatewayGas, okxGatewaySimulate, okxGatewayBroadcast } from "./okx-onchain-gateway.js";
import { okxWalletBalances, okxWalletTotalValue } from "./okx-wallet-portfolio.js";
import { okxAuditLog } from "./okx-audit-log.js";
import { uniswapQuote } from "./uniswap-trading-api.js";

export const strategistTools: Record<string, Tool> = {
  okxDexSignal,
  okxSmartMoneyTracker,
  okxTokenHotTokens,
  okxTokenAdvancedInfo,
  okxTokenPriceInfo,
  okxMarketPrice,
  okxMarketKline,
  okxDexTrenches,
  okxDefiPositions,
  uniswapQuote,
};

export const sentinelTools: Record<string, Tool> = {
  okxSecurityTokenScan,
  okxTokenAdvancedInfo,
  okxTokenPriceInfo,
  okxMarketPrice,
};

export const executorTools: Record<string, Tool> = {
  okxSwapQuote,
  okxSwapExecute,
  okxGatewayGas,
  okxGatewaySimulate,
  okxGatewayBroadcast,
  okxDefiSearch,
  okxDefiInvest,
  okxDefiCollect,
};

export const curatorTools: Record<string, Tool> = {
  okxWalletBalances,
  okxWalletTotalValue,
  okxAuditLog,
};
