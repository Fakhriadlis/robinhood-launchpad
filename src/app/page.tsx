'use client';

import { Navbar } from '../components/Navbar';
import { useReadContract } from 'wagmi';
import LaunchFactoryABI from '../abi/LaunchFactory.json';
import { CONTRACT_ADDRESSES } from '../config/wagmi';
import { formatEther } from 'viem';

export default function Home() {
  const { data: launchFee, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.LAUNCH_FACTORY,
    abi: LaunchFactoryABI,
    functionName: 'launchFee',
  });

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Langkah 1 Checkpoint</h2>
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">Launch Fee dari Smart Contract Factory:</p>
          <p className="text-xl font-mono text-green-400">
            {isLoading ? 'Loading...' : launchFee !== undefined ? `${formatEther(launchFee as bigint)} ETH` : 'Gagal Membaca'}
          </p>
        </div>
      </div>
    </main>
  );
}