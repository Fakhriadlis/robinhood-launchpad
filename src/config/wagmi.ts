import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';

export const robinhoodTestnet = defineChain({
  id: 46_630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://robinhood-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Robinhood Explorer',
      url: 'https://explorer.testnet.chain.robinhood.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
});

export const config = createConfig({
  chains: [robinhoodTestnet],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
});

export const CONTRACT_ADDRESSES = {
  LAUNCH_FACTORY: '0x533cE670f1372cb402D49866608b92e7bc2b4493' as `0x${string}`,
  DEPLOY_BLOCK: 129_157_568n,
};