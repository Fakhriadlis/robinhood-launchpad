'use client';

import { TokenItem } from '@/services/tokenService';

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Trading', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  1: { label: 'Pending Pool', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  2: { label: 'Graduated', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  3: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface TokenCardProps {
  token: TokenItem;
  onSelect: (token: TokenItem) => void;
}

export function TokenCard({ token, onSelect }: TokenCardProps) {
  const phaseInfo = PHASE_LABELS[token.phase] || { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400' };

  // Format harga spot kecil agar tidak pernah menampilkan 0.00
  const formattedPrice = token.spotPrice === 0 
    ? '0' 
    : token.spotPrice < 0.0001 
      ? token.spotPrice.toExponential(4) 
      : token.spotPrice.toFixed(8);

  return (
    <div 
      onClick={() => onSelect(token)}
      className="p-5 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl cursor-pointer transition flex flex-col justify-between gap-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {token.logo ? (
            <img 
              src={token.logo} 
              alt={token.name} 
              className="w-10 h-10 rounded-full object-cover bg-gray-800"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-green-400">
              {token.symbol.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="font-bold text-white text-lg">{token.name}</h3>
            <p className="text-xs text-gray-400">${token.symbol}</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${phaseInfo.color}`}>
          {phaseInfo.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Harga Spot:</span>
          <span className="font-mono font-medium text-white">{formattedPrice} ETH</span>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Graduation Progress</span>
            <span className="text-green-400 font-medium">{token.progressPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${token.progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}