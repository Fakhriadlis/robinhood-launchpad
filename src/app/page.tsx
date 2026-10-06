'use client';

import { Navbar } from '../components/Navbar';
import { TokenCard } from '../components/TokenCard';
import { BuyModal } from '../components/BuyModal';
import { fetchAllTokensWithDetails, TokenItem } from '../services/tokenService';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function Home() {
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);

  const { data: tokens, isLoading, isError, refetch } = useQuery({
    queryKey: ['launchedTokens'],
    queryFn: fetchAllTokensWithDetails,
    refetchInterval: 10_000,
  });

  return (
    <main className="min-h-screen pb-12">
      <Navbar />

      <div className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Market Tokens</h2>
            <p className="text-sm text-gray-400">Daftar token aktif di Robinhood Bonding Curve</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded-lg transition"
          >
            🔄 Refresh List
          </button>
        </div>

        {/* State 1: Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-44 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* State 2: Error State */}
        {isError && (
          <div className="p-8 text-center bg-red-950/20 border border-red-900/50 rounded-xl my-6">
            <p className="text-red-400 font-medium mb-3">Gagal memuat data token dari blockchain.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!isLoading && !isError && tokens?.length === 0 && (
          <div className="p-12 text-center bg-gray-900 border border-gray-800 rounded-xl my-6">
            <p className="text-gray-400">Belum ada token yang di-launch.</p>
          </div>
        )}

        {/* State 4: List Token */}
        {!isLoading && !isError && tokens && tokens.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <TokenCard 
                key={token.token} 
                token={token} 
                onSelect={(selected) => setSelectedToken(selected)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Buy Modal Component */}
      {selectedToken && (
        <BuyModal
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
          onSuccess={() => {
            refetch();
            setSelectedToken(null);
          }}
        />
      )}
    </main>
  );
}