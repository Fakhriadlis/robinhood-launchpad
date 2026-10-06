import { createPublicClient, http, parseAbiItem, type Abi } from 'viem';
import { robinhoodTestnet, CONTRACT_ADDRESSES } from '../config/wagmi';
import LaunchFactoryABI from '../abi/LaunchFactory.json';
import BondingCurveABI from '../abi/BondingCurve.json';
import LauncherTokenABI from '../abi/LauncherToken.json';


const factoryAbi = LaunchFactoryABI as unknown as Abi;
const bondingAbi = BondingCurveABI as unknown as Abi;
const tokenAbi = LauncherTokenABI as unknown as Abi;

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

  const currentBlock = await publicClient.getBlockNumber();
  const startBlock = BigInt(CONTRACT_ADDRESSES.DEPLOY_BLOCK);
  const CHUNK_SIZE = BigInt(45000);

  let logs: any[] = [];

  for (let from = startBlock; from <= currentBlock; from += CHUNK_SIZE) {
    const to = from + CHUNK_SIZE - BigInt(1) > currentBlock ? currentBlock : from + CHUNK_SIZE - BigInt(1);
    const chunkLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESSES.LAUNCH_FACTORY,
      event: TOKEN_LAUNCHED_EVENT,
      fromBlock: from,
      toBlock: to,
    });
    logs = [...logs, ...chunkLogs];
  }

  if (logs.length === 0) return [];


  const ethTokens = logs
    .map((log) => ({
      token: log.args.token as `0x${string}`,
      curve: log.args.curve as `0x${string}`,
      deployer: log.args.deployer as `0x${string}`,
      pairToken: log.args.pairToken as `0x${string}`,
      graduationThreshold: log.args.graduationThreshold as bigint,
    }))
    .filter((t) => t.pairToken === '0x0000000000000000000000000000000000000000');


  const calls = ethTokens.flatMap(({ token, curve }) => [
    { address: token, abi: tokenAbi, functionName: 'name' },
    { address: token, abi: tokenAbi, functionName: 'symbol' },
    { address: token, abi: tokenAbi, functionName: 'logo' },
    { address: curve, abi: bondingAbi, functionName: 'getReserves' },
    { address: curve, abi: bondingAbi, functionName: 'realQuoteReserve' },
    { address: curve, abi: bondingAbi, functionName: 'graduationThreshold' },
    { address: CONTRACT_ADDRESSES.LAUNCH_FACTORY, abi: factoryAbi, functionName: 'getLaunchedToken', args: [token] },
  ]);

  const results = await publicClient.multicall({
    contracts: calls as any,
    allowFailure: true,
  });


  return ethTokens.map((item, index) => {
    const offset = index * 7;
    const name = (results[offset]?.result as string) || 'Unknown Token';
    const symbol = (results[offset + 1]?.result as string) || '???';
    const logo = (results[offset + 2]?.result as string) || '';
    
    const [quoteReserve, tokenReserve] = (results[offset + 3]?.result as [bigint, bigint]) || [BigInt(0), BigInt(0)];
    const realQuoteReserve = (results[offset + 4]?.result as bigint) || BigInt(0);
    const graduationThreshold = (results[offset + 5]?.result as bigint) || item.graduationThreshold || BigInt(1);
    const launchedStruct = results[offset + 6]?.result as any;
    const phase = launchedStruct?.phase !== undefined ? Number(launchedStruct.phase) : 0;


    const spotPrice = tokenReserve > BigInt(0) ? Number(quoteReserve) / Number(tokenReserve) : 0;


    const progressBasisPoints = graduationThreshold > BigInt(0) ? (realQuoteReserve * BigInt(10000)) / graduationThreshold : BigInt(0);
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