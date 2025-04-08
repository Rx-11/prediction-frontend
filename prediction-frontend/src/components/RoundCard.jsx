// src/components/RoundCard.jsx
import React from 'react';
import { useCountdown, formatCountdown } from '../hooks/useCountdown';
import { formatPrice, formatBigIntTimestamp, formatPayout } from '../utils/formatting'; // Import formatPayout
import { TrendingUp, TrendingDown, PlayCircle, Lock, CheckCircle, Clock, HelpCircle, XCircle } from 'lucide-react';

// --- Status Styling Helpers ---
const getStatusBgColor = (status, isLive, isProcessing) => {
     if (isLive) return 'bg-gradient-to-b from-green-400 to-green-500 dark:from-green-500 dark:to-green-600 shadow-lg';
     if (isProcessing) return 'bg-gradient-to-b from-yellow-400 to-yellow-500 dark:from-yellow-500 dark:to-yellow-600';
     switch (status) {
       case 'Closed': return 'bg-gradient-to-b from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700';
       case 'Error': return 'bg-red-500 dark:bg-red-600';
       default: return 'bg-gray-400 dark:bg-gray-700';
     }
};

const getStatusIcon = (status, isLive, isProcessing) => {
     if (isLive) return <PlayCircle className="w-4 h-4 mr-1.5" />;
     if (isProcessing) return <Lock className="w-4 h-4 mr-1.5" />;
     switch (status) {
         case 'Closed': return <CheckCircle className="w-4 h-4 mr-1.5" />;
         case 'Error': return <XCircle className="w-4 h-4 mr-1.5" />;
         default: return <Clock className="w-4 h-4 mr-1.5" />;
     }
 };


export const RoundCard = ({ round, epochProp, isLive = false, isProcessing = false, isNext = false, isLater = false, nextRoundStartTime = null }) => {

    const status = round?.status ?? (isNext || isLater ? 'Waiting' : 'Loading');
    const epoch = round?.epoch ?? epochProp;

    let countdownTarget = null; let countdownLabel = '';
    if (isNext && nextRoundStartTime) { countdownTarget = nextRoundStartTime; countdownLabel = 'Starts in'; }
    else if (round) {
         if (round.status === 'Started' && round.lockTimestamp) { countdownTarget = round.lockTimestamp; countdownLabel = 'Locks in'; }
         else if (['Locked', 'ProcessingLock'].includes(round.status) && round.closeTimestamp) { countdownTarget = round.closeTimestamp; countdownLabel = 'Closes in'; }
    }
    const remainingSeconds = useCountdown(countdownTarget);

    // --- Render Logic ---

    if (isNext) { /* ... Next Round Placeholder JSX ... */
        return (
             <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[210px]">
                  <div className={`flex items-center justify-between px-3 py-1 text-xs font-medium text-white ${getStatusBgColor('Waiting')}`}>
                     <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> Next</span>
                     <span>#{epoch}</span>
                 </div>
                 <div className="flex-grow p-4 flex flex-col items-center justify-center text-center">
                     <div className="mb-3 opacity-50">
                          <div className="bg-green-100 dark:bg-green-900/50 w-20 h-6 rounded-t-md mx-auto relative flex items-center justify-center text-green-700 dark:text-green-300 text-xs font-bold">UP</div>
                          <div className="bg-gray-100 dark:bg-gray-700/50 w-28 h-10 rounded-md -mt-1 mx-auto flex items-center justify-center">
                              <p className="text-sm text-gray-500 dark:text-gray-400">Entry starts</p>
                          </div>
                          <div className="bg-red-100 dark:bg-red-900/50 w-20 h-6 rounded-b-md mx-auto -mt-1 relative flex items-center justify-center text-red-700 dark:text-red-300 text-xs font-bold">DOWN</div>
                     </div>
                     <p className="text-2xl font-mono font-semibold text-gray-700 dark:text-gray-200">
                         ~{remainingSeconds !== null ? formatCountdown(remainingSeconds) : '--:--'}
                     </p>
                 </div>
              </div>
        );
    }
    if (isLater) { /* ... Later Round Placeholder JSX ... */
         return (
              <div className="flex flex-col bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden min-h-[210px] opacity-60">
                  <div className={`flex items-center justify-between px-3 py-1 text-xs font-medium text-gray-200 dark:text-gray-400 ${getStatusBgColor('Waiting')}`}>
                     <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> Later</span>
                     <span>#{epoch}</span>
                  </div>
                  <div className="flex-grow p-4 flex flex-col items-center justify-center text-center">
                     <div className="mb-3 opacity-30">
                          <div className="bg-green-100 dark:bg-green-900/30 w-20 h-6 rounded-t-md mx-auto"></div>
                          <div className="bg-gray-100 dark:bg-gray-700/30 w-28 h-10 rounded-md -mt-1 mx-auto flex items-center justify-center"><p className="text-sm text-gray-400 dark:text-gray-500">Waiting</p></div>
                          <div className="bg-red-100 dark:bg-red-900/30 w-20 h-6 rounded-b-md mx-auto -mt-1"></div>
                      </div>
                  </div>
              </div>
         );
     }
    if (!round || status === 'Loading') { /* ... Loading State JSX ... */
         return (
              <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[210px] animate-pulse">
                   <div className={`flex items-center justify-between px-3 py-1 text-xs font-medium text-white ${getStatusBgColor('Loading')}`}>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> Loading</span>
                      <span>#{epoch}</span>
                  </div>
                  <div className="p-4 space-y-3">
                       <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                       <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto my-4"></div>
                       <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                       <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
                  </div>
              </div>
          );
    }
    if (status === 'Error') { /* ... Error State JSX ... */
        return (
             <div className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-red-300 dark:border-red-700 overflow-hidden min-h-[210px]">
                  <div className={`flex items-center justify-between px-3 py-1 text-xs font-medium text-white ${getStatusBgColor('Error')}`}>
                     <span className="flex items-center"><XCircle className="w-3 h-3 mr-1"/> Error</span>
                     <span>#{epoch}</span>
                  </div>
                  <div className="flex-grow p-4 flex items-center justify-center text-center"><p className="text-sm text-red-600 dark:text-red-400">Failed to load round data.</p></div>
             </div>
        );
     }

    // --- Standard Round Display ---
    const { lockPrice, closePrice, bullAmount, bearAmount, totalAmount } = round;
    const upPayout = formatPayout(bullAmount, bearAmount);
    const downPayout = formatPayout(bearAmount, bullAmount);
    let resultIcon = null; let resultColor = 'text-gray-700 dark:text-gray-300';
    if (status === 'Closed' && lockPrice && closePrice && lockPrice !== "0" && closePrice !== "0") {
         try {
             const lockP = BigInt(lockPrice); const closeP = BigInt(closePrice);
             if (closeP > lockP) { resultIcon = <TrendingUp className="w-5 h-5 text-green-500" />; resultColor = 'text-green-500 font-bold'; }
             else if (closeP < lockP) { resultIcon = <TrendingDown className="w-5 h-5 text-red-500" />; resultColor = 'text-red-500 font-bold'; }
         } catch (e) { console.error("Error comparing prices", e); }
    }
    const statusText = status.startsWith('Processing') ? status.replace('Processing', '') + '...' : status;


    return (
         <div className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden min-h-[210px] ${isLive ? 'ring-2 ring-green-500 shadow-lg' : ''} ${isProcessing ? 'ring-2 ring-yellow-500' : ''}`}>
             <div className={`flex items-center justify-between px-3 py-1 text-xs font-medium text-white ${getStatusBgColor(status, isLive, isProcessing)}`}>
                 <span className="flex items-center">{getStatusIcon(status, isLive, isProcessing)} {statusText}</span>
                 <span>#{epoch}</span>
             </div>

             {remainingSeconds !== null && countdownLabel && (
                  <div className="text-center py-1 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">{countdownLabel}</span>
                      <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">{formatCountdown(remainingSeconds)}</span>
                  </div>
              )}

             <div className="flex-grow p-3 space-y-2">
                  <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded text-center">
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-300 uppercase">UP</p>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-200">{upPayout}x Payout</p>
                  </div>

                   <div className="text-center py-1 space-y-0.5">
                       {status === 'Closed' && closePrice ? (
                           <>
                               <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Closed Price</p>
                               <div className={`flex items-center justify-center space-x-1 ${resultColor}`}> {resultIcon}<span className="text-lg font-bold font-mono">{formatPrice(closePrice)}</span></div>
                           </>
                       ) : lockPrice && lockPrice !== "0" ? ( // Show lock price if set (and not zero placeholder)
                           <>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{status === 'Started' ? 'Current Price' : 'Locked Price'}</p> {/* Change label maybe */}
                                <p className={`text-lg font-bold font-mono ${status === 'Started' ? 'animate-pulse' : ''}`}>{formatPrice(lockPrice)}</p> {/* Maybe animate current price */}
                           </>
                       ) : (
                            <p className="text-lg font-bold font-mono text-gray-500 dark:text-gray-400 h-7 animate-pulse">...</p>
                       )}
                        {/* Show Locked Price underneath if Closed */}
                        {status === 'Closed' && lockPrice && lockPrice !== "0" && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Locked: <span className="font-mono">{formatPrice(lockPrice)}</span></p>
                        )}
                   </div>

                  <div className="bg-red-50 dark:bg-red-900/30 p-2 rounded text-center">
                      <p className="text-[10px] font-medium text-red-600 dark:text-red-300 uppercase">DOWN</p>
                       <p className="text-sm font-semibold text-red-700 dark:text-red-200">{downPayout}x Payout</p>
                  </div>
             </div>

              {(isLive) && ( /* ... Action Buttons ... */
                   <div className="p-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                       <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center disabled:opacity-50" disabled={status !== 'Started'}>
                           <TrendingUp className="w-4 h-4 mr-1"/> Enter UP
                       </button>
                        <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center disabled:opacity-50" disabled={status !== 'Started'}>
                           <TrendingDown className="w-4 h-4 mr-1"/> Enter DOWN
                       </button>
                   </div>
               )}
               {(status === 'Closed' /* && user can claim */) && ( /* ... Claim Button ... */
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                        <button className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition-colors">Claim Winnings</button>
                    </div>
               )}
         </div>
    );
};