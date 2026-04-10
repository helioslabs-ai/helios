import type { Tool } from "ai";
import { okxAuditLog } from "./okx-audit-log.js";
import { okxDefiCollect, okxDefiInvest, okxDefiSearch } from "./okx-defi-invest.js";
import { okxDefiPositions } from "./okx-defi-portfolio.js";
import { okxMarketKline, okxMarketPrice } from "./okx-dex-market.js";
import { okxDexSignal, okxSmartMoneyTracker } from "./okx-dex-signal.js";
import { okxSwapExecute, okxSwapQuote } from "./okx-dex-swap.js";
import { okxTokenAdvancedInfo, okxTokenHotTokens, okxTokenPriceInfo } from "./okx-dex-token.js";
import { okxDexTrenches } from "./okx-dex-trenches.js";
import { okxGatewayBroadcast, okxGatewayGas, okxGatewaySimulate } from "./okx-onchain-gateway.js";
import { okxSecurityTokenScan } from "./okx-security.js";
import { okxWalletBalances, okxWalletTotalValue } from "./okx-wallet-portfolio.js";
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
