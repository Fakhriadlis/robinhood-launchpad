import { createPublicClient, http, parseAbiItem } from 'viem';
import { robinhoodTestnet, CONTRACT_ADDRESSES } from '../config/wagmi';
import LaunchFactoryABI from '../abi/LaunchFactory.json';
import BondingCurveABI from '../abi/BondingCurve.json';
import LauncherTokenABI from '../abi/LauncherToken.json';

const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
});

const TOKEN_LAUNCHED_EVENT = parseAbiItem(
  'event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)'
);

export interface TokenItem {
  token: `0x${string}`;
  curve: `0x${string}`;
  deployer: `0x${string}`;
  pairToken: `0x${string}`;
  graduationThreshold: bigint;
  name: string;
  symbol: string;
  logo: string;
  quoteReserve: bigint;
  tokenReserve: bigint;
  realQuoteReserve: bigint;
  phase: number;
  spotPrice: number;
  progressPercent: number;
}

export async function fetchAllTokensWithDetails(): Promise<TokenItem[]> {
  // 1. Ambil logs event TokenLaunched bertahap (chunking max 45,000 blocks)
  const currentBlock = await publicClient.getBlockNumber();
  const startBlock = CONTRACT_ADDRESSES.DEPLOY_BLOCK;
  const CHUNK_SIZE = 45_000n;

  let logs: any[] = [];

  for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
    const to = from + CHUNK_SIZE - 1n > currentBlock ? currentBlock : from + CHUNK_SIZE - 1n;
    const chunkLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.LAUNCH_FACTORY,
      event: TOKEN_LAUNCHED_EVENT,
      fromBlock: from,
      toBlock: to,
    });
    logs = [...logs, ...chunkLogs];
  }

  if (logs.length === 0) return [];

  // Filter token pair ETH only (pairToken === 0x000...)
  const ethTokens = logs
    .map((log) => ({
      token: log.args.token as `0x${string}`,
      curve: log.args.curve as `0x${string}`,
      deployer: log.args.deployer as `0x${string}`,
      pairToken: log.args.pairToken as `0x${string}`,
      graduationThreshold: log.args.graduationThreshold as bigint,
    }))
    .filter((t) => t.pairToken === '0x0000000000000000000000000000000000000000');

  // 2. Multicall3 untuk ambil detail semua token sekaligus
  const calls = ethTokens.flatMap(({ token, curve }) => [
    { address: token, abi: LauncherTokenABI, functionName: 'name' },
    { address: token, abi: LauncherTokenABI, functionName: 'symbol' },
    { address: token, abi: LauncherTokenABI, functionName: 'logo' },
    { address: curve, abi: BondingCurveABI, functionName: 'getReserves' },
    { address: curve, abi: BondingCurveABI, functionName: 'realQuoteReserve' },
    { address: curve, abi: BondingCurveABI, functionName: 'graduationThreshold' },
    { address: CONTRACT_ADDRESSES.LAUNCH_FACTORY, abi: LaunchFactoryABI, functionName: 'getLaunchedToken', args: [token] },
  ]);

  const results = await publicClient.multicall({
    contracts: calls,
    allowFailure: true,
  });

  // 3. Re-map hasil Multicall ke struktur TokenItem
  return ethTokens.map((item, index) => {
    const offset = index * 7;
    const name = (results[offset]?.result as string) || 'Unknown Token';
    const symbol = (results[offset + 1]?.result as string) || '???';
    const logo = (results[offset + 2]?.result as string) || '';
    
    const [quoteReserve, tokenReserve] = (results[offset + 3]?.result as [bigint, bigint]) || [0n, 0n];
    const realQuoteReserve = (results[offset + 4]?.result as bigint) || 0n;
    const graduationThreshold = (results[offset + 5]?.result as bigint) || item.graduationThreshold || 1n;
    const launchedStruct = results[offset + 6]?.result as any;
    const phase = launchedStruct?.phase !== undefined ? Number(launchedStruct.phase) : 0;

    // Hitung Spot Price (ETH / Token)
    const spotPrice = tokenReserve > 0n ? Number(quoteReserve) / Number(tokenReserve) : 0;

    // Hitung Progress Graduation (%)
    const progressBasisPoints = graduationThreshold > 0n ? (realQuoteReserve * 10000n) / graduationThreshold : 0n;
    const progressPercent = Math.min(Number(progressBasisPoints) / 100, 100);

    return {
      ...item,
      name,
      symbol,
      logo,
      quoteReserve,
      tokenReserve,
      realQuoteReserve,
      graduationThreshold,
      phase,
      spotPrice,
      progressPercent,
    };
  });
}