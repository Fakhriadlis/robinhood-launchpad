'use client';

import { useState } from 'react';
import { TokenItem } from '../services/tokenService';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import BondingCurveABI from '../abi/BondingCurve.json';
import { parseEther, formatEther } from 'viem';

interface BuyModalProps {
  token: TokenItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function BuyModal({ token, onClose, onSuccess }: BuyModalProps) {
  const { address, isConnected } = useAccount();
  const [ethAmount, setEthAmount] = useState<string>('0.001');
  const [slippage, setSlippage] = useState<number>(1);

  const ethAmountWei = ethAmount && !isNaN(Number(ethAmount)) && Number(ethAmount) > 0 
    ? parseEther(ethAmount) 
    : 0n;

  const recipientAddress = address || ('0x0000000000000000000000000000000000000000' as `0x${string}`);
  const zeroAddress = '0x0000000000000000000000000000000000000000' as `0x${string}`;

  // 1. Fetch estimasi token dari getAmountOut
  const { data: expectedTokensBigInt, isLoading: isEstimating } = useReadContract({
    address: token.curve,
    abi: BondingCurveABI,
    functionName: 'getAmountOut',
    args: [ethAmountWei, true, zeroAddress],
    query: {
      enabled: ethAmountWei > 0n,
    },
  });

  const rawExpected = expectedTokensBigInt ? (expectedTokensBigInt as bigint) : 0n;

  // Fallback jika getAmountOut mengembalikan 0n
  let expectedTokens = rawExpected;
  if (expectedTokens === 0n && ethAmountWei > 0n && token.spotPrice > 0) {
    const approx = Number(ethAmountWei) / (token.spotPrice * 1e18);
    if (!isNaN(approx) && approx > 0) {
      expectedTokens = BigInt(Math.floor(approx * 1e18));
    }
  }

  // Hitung minTokensOut dari expectedTokens minus slippage
  const minTokensOut = expectedTokens > 0n
    ? (expectedTokens * BigInt(Math.floor((100 - slippage) * 100))) / 10000n
    : 1n; // Set minimal 1n wei

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuy = () => {
    if (!ethAmountWei || ethAmountWei <= 0n) return;

    // Menentukan Gas Limit realistis (150,000 gas) agar estimasi harga gas di MetaMask wajar
    writeContract({
      address: token.curve,
      abi: BondingCurveABI,
      functionName: 'buy',
      args: [
        minTokensOut, 
        recipientAddress, 
        zeroAddress
      ],
      value: ethAmountWei,
      gas: 150_000n, // Set gas limit wajar untuk transaksi swap/buy
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-white mb-1">Beli Token {token.symbol}</h3>
        <p className="text-xs text-gray-400 mb-6">{token.name}</p>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <p className="text-green-400 font-bold text-lg">Pembelian Berhasil!</p>
            <p className="text-xs text-gray-400 font-mono break-all">Tx Hash: {hash}</p>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg text-sm w-full"
            >
              Tutup & Refresh Data
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Jumlah ETH</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                  placeholder="0.001"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-green-500"
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">ETH</span>
              </div>
            </div>

            <div className="p-3 bg-gray-950 border border-gray-800/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Perkiraan Dapat:</span>
                <span className="font-mono font-bold text-green-400">
                  {isEstimating ? 'Menghitung...' : expectedTokens > 0n ? formatEther(expectedTokens) : '0'} {token.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Min. Diterima ({slippage}% Slippage):</span>
                <span className="font-mono text-gray-300">
                  {minTokensOut > 1n ? formatEther(minTokensOut) : '0'} {token.symbol}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Slippage Tolerance</label>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSlippage(val)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      slippage === val
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {(writeError || isTxError) && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-400 font-mono break-all">
                <p className="font-bold mb-1">Error:</p>
                <p>{writeError?.message || txError?.message || 'Gagal memproses transaksi.'}</p>
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={!isConnected || isPending || isConfirming || ethAmountWei <= 0n}
              className="w-full py-3.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {isPending
                ? 'Konfirmasi di Wallet...'
                : isConfirming
                ? 'Menunggu Blok Transaction...'
                : `Beli ${token.symbol}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}