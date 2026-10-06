'use client';

import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { robinhoodTestnet } from '../config/wagmi';
import { formatEther } from 'viem';
import { useState, useEffect } from 'react';

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  // Cegah Hydration Mismatch dengan menunggu mount di Client Side
  useEffect(() => {
    setMounted(true);
  }, []);

  const isWrongNetwork = isConnected && chainId !== robinhoodTestnet.id;

  return (
    <nav className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
      <h1 className="text-xl font-bold text-green-400">🚀 Robinhood Launchpad</h1>

      <div className="flex items-center gap-4">
        {!mounted ? (
          // Placeholder loading saat initial mount
          <div className="h-9 w-32 bg-gray-800 rounded-lg animate-pulse" />
        ) : (
          <>
            {isConnected && isWrongNetwork && (
              <button
                onClick={() => switchChain({ chainId: robinhoodTestnet.id })}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg text-sm transition"
              >
                Switch to Robinhood Chain
              </button>
            )}

            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <p className="text-gray-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="font-bold text-green-400">
                    {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0'} ETH
                  </p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg text-sm transition font-medium"
              >
                Connect Wallet
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
}