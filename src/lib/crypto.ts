export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH';

export type BoostTier = {
  days: number;
  label: string;
  priceUSD: number;
  popular?: boolean;
};

export const BOOST_TIERS: BoostTier[] = [
  { days: 7, label: '7 Days', priceUSD: 49 },
  { days: 14, label: '14 Days', priceUSD: 89, popular: true },
  { days: 30, label: '30 Days', priceUSD: 149 },
];

export const CURRENCY_INFO: Record<
  CryptoCurrency,
  { label: string; symbol: string; network: string; icon: string }
> = {
  USDT: { label: 'USDT', symbol: '₮', network: 'TRC-20 / ERC-20', icon: 'tether' },
  BTC: { label: 'Bitcoin', symbol: '₿', network: 'Bitcoin Network', icon: 'bitcoin' },
  ETH: { label: 'Ethereum', symbol: 'Ξ', network: 'ERC-20', icon: 'ethereum' },
};

export type SiteSettings = {
  id: string;
  usdt_address: string;
  btc_address: string;
  eth_address: string;
  price_7_days_usd: number;
  price_14_days_usd: number;
  price_30_days_usd: number;
};

export function getWalletAddress(settings: SiteSettings, currency: CryptoCurrency): string {
  switch (currency) {
    case 'USDT':
      return settings.usdt_address;
    case 'BTC':
      return settings.btc_address;
    case 'ETH':
      return settings.eth_address;
  }
}

export function getTierPrice(settings: SiteSettings, days: number): number {
  switch (days) {
    case 7:
      return settings.price_7_days_usd;
    case 14:
      return settings.price_14_days_usd;
    case 30:
      return settings.price_30_days_usd;
    default:
      return 0;
  }
}

// Approximate crypto amounts for display. In production these would come from a 
// live price API, but for MVP we use fixed conversion rates so the founder knows 
// exactly how much to send.
export const CRYPTO_RATES: Record<CryptoCurrency, number> = {
  USDT: 1, // 1 USDT = $1
  BTC: 0.0000152, // approx $65,800 per BTC
  ETH: 0.00038, // approx $2,630 per ETH
};

export function usdToCrypto(usd: number, currency: CryptoCurrency): string {
  const amount = usd * CRYPTO_RATES[currency];
  if (currency === 'USDT') return amount.toFixed(2);
  if (currency === 'BTC') return amount.toFixed(8);
  return amount.toFixed(6);
}
