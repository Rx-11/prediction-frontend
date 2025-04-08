// src/App.jsx
import React, { useEffect, useMemo } from 'react';
import { useRoundContext } from './contexts/RoundContext'; // Ensure correct path
import { RoundCard } from './components/RoundCard';
import { formatPrice } from './utils/formatting'; // Assuming utils file

const DEFAULT_INTERVAL_SECONDS = 300; // Ensure this matches contract

function App() {
    // Get derived epochs directly from context provider's value now
    const { state, fetchRound, liveEpoch, processingEpoch } = useRoundContext();
    // Destructure raw state needed
    const { rounds, latestEpoch, connectionStatus, currentPrice } = state;

    // Calculation for nextRoundStartTime (based on processing round's close time)
    const nextRoundStartTime = useMemo(() => {
        const processingRound = processingEpoch ? rounds?.[processingEpoch] : null;
        if (!processingRound) return null; // Cannot estimate if nothing is processing

        let basisTimestamp = null;
        // Estimate close time based on lock time + interval
        if (processingRound.lockTimestamp) {
             basisTimestamp = processingRound.lockTimestamp + BigInt(DEFAULT_INTERVAL_SECONDS);
        } else if (processingRound.startTimestamp) {
             // Fallback: estimate based on start time + 2 * interval (less accurate)
             basisTimestamp = processingRound.startTimestamp + BigInt(DEFAULT_INTERVAL_SECONDS * 2);
        }
        return basisTimestamp;
    }, [rounds, processingEpoch]); // Depends on rounds data and which epoch is processing

    // Determine the specific epochs AND THEIR TYPE more accurately
    const displayEpochConfig = useMemo(() => {
        const config = []; // Array of objects: { epochStr: "...", type: "..." }
        const addedEpochs = new Set(); // To track added epochs and avoid duplicates

        console.log(`[App] Recalculating Display Config: latest=${latestEpoch}, live=${liveEpoch}, proc=${processingEpoch}`);

        // Helper to add epoch to config if not already present
        const addEpochToConfig = (epochStr, explicitType = null) => {
            if (!epochStr || addedEpochs.has(epochStr)) return;

            let calculatedType = explicitType;
            if (!calculatedType) {
                // Determine type based on derived state if not explicitly given
                if (epochStr === liveEpoch) calculatedType = 'live';
                else if (epochStr === processingEpoch) calculatedType = 'processing';
                // Check if it's truly upcoming based on latest known *started* epoch
                else if (latestEpoch && BigInt(epochStr) > BigInt(latestEpoch)) {
                     if (BigInt(epochStr) === BigInt(latestEpoch) + 1n) calculatedType = 'next';
                     else calculatedType = 'later';
                }
                // Fallback: Check actual round status if data exists, otherwise assume historical/waiting
                else {
                     const roundData = rounds?.[epochStr];
                     if (roundData) {
                         if (roundData.status === 'Closed') calculatedType = 'historical';
                         else if (roundData.status === 'Started') calculatedType = 'live'; // Should be caught?
                         else if (['Locked', 'ProcessingLock', 'ProcessingClose'].includes(roundData.status)) calculatedType = 'processing'; // Should be caught?
                         else calculatedType = 'historical'; // Default for other known statuses
                     } else {
                         calculatedType = 'historical'; // If epoch <= latestEpoch and no data, assume historical/old
                     }
                }
            }

            config.push({ epochStr, type: calculatedType });
            addedEpochs.add(epochStr);
        };

        // Add known states first to prioritize them visually if needed later
        addEpochToConfig(liveEpoch, 'live');
        addEpochToConfig(processingEpoch, 'processing');

        // Calculate and add future rounds based on latestEpoch
        if (latestEpoch) {
            const latestBigInt = BigInt(latestEpoch);
            // Determine 'next' and 'later' based on comparison to latest *started* epoch
            addEpochToConfig((latestBigInt + 1n).toString(), 'next');
            addEpochToConfig((latestBigInt + 2n).toString(), 'later');

            // Add latestEpoch itself if it wasn't live or processing
            addEpochToConfig(latestEpoch); // Let the helper determine its actual type
        } else if (liveEpoch) {
             // Handle edge case where live is known but latest isn't yet
             const liveBigInt = BigInt(liveEpoch);
             addEpochToConfig((liveBigInt + 1n).toString(), 'next');
             addEpochToConfig((liveBigInt + 2n).toString(), 'later');
        }


        // Sort descending by epoch number
        config.sort((a, b) => Number(b.epochStr) - Number(a.epochStr));

        console.log("[App] Display Config:", config);
        return config.slice(0, 5); // Limit to e.g., 5 cards

    // ONLY depend on the epoch identifiers determining *which* rounds to show
    }, [latestEpoch, liveEpoch, processingEpoch]);


    // Fetch data effect - fetch based on calculated display epochs
    useEffect(() => {
        console.log(`[App] Fetch Effect Checking - Display Config: [${displayEpochConfig.map(c=>c.epochStr).join(', ')}]`);
        displayEpochConfig.forEach(({ epochStr, type }) => {
            // Only fetch if it's NOT explicitly a placeholder type determined above
            // Let fetchRound handle its own "don't fetch closed" logic if desired
            if (type === 'next' || type === 'later') {
                 console.log(`[App] Skipping fetch for placeholder type ${type} epoch ${epochStr}`);
                 return;
            }

            const roundData = rounds?.[epochStr]; // Safe access
            // Fetch if no data or in an intermediate/loading state
            if (epochStr && (!roundData || ['Waiting', 'Loading', 'ProcessingLock', 'ProcessingClose'].includes(roundData.status))) {
                console.log(`[App] Triggering fetch for epoch: ${epochStr} (Type: ${type}, Status: ${roundData?.status})`);
                fetchRound(epochStr); // Fetch function from context
            }
        });
        // Depend on the config array reference and fetchRound (which is stable)
    }, [displayEpochConfig, fetchRound]);


    return (
        <div className="p-4 min-h-screen bg-gradient-to-b from-purple-100 via-indigo-100 to-gray-100 dark:from-gray-900 dark:via-indigo-900/30 dark:to-gray-900 text-black dark:text-white transition-colors duration-200">
            <header className="text-center mb-6 pb-4 ">
                <h1 className="text-3xl font-bold">Prediction Market</h1>
                <div className="mt-2 text-2xl font-bold font-mono text-green-500 dark:text-green-400">
                    {currentPrice ? formatPrice(currentPrice) : <span className="animate-pulse">$---.--------</span>}
                 </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                     {connectionStatus}
                     {latestEpoch && ` | Latest: ${latestEpoch}`}
                     {liveEpoch && ` | Live: ${liveEpoch}`}
                     {processingEpoch && ` | Processing: ${processingEpoch}`}
                 </p>
            </header>

            <div className="flex space-x-4 overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                 {displayEpochConfig.length === 0 && connectionStatus !== 'Error' && (
                     <div className="flex-shrink-0 w-64 h-52 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg shadow p-4">
                          <p className="text-center text-gray-500 dark:text-gray-400">
                             {connectionStatus === 'Connecting' || connectionStatus === 'Initializing' ? 'Connecting...' : 'Waiting for first round...'}
                          </p>
                     </div>
                 )}

                {displayEpochConfig.map(({ epochStr, type }) => {
                    // Determine props for RoundCard based on calculated type
                    const isNext = type === 'next';
                    const isLater = type === 'later';

                    return (
                        <div key={epochStr} className="flex-shrink-0 w-64"> {/* Ensure consistent width */}
                            <RoundCard
                                round={rounds?.[epochStr]} // Pass data (or undefined) using safe access
                                epochProp={epochStr} // Always pass the epoch number
                                isLive={type === 'live'}
                                isProcessing={type === 'processing'}
                                isNext={isNext}
                                isLater={isLater}
                                // Pass start time ONLY if it's the calculated 'next' type
                                nextRoundStartTime={isNext ? nextRoundStartTime : null}
                            />
                        </div>
                    );
                })}
            </div>

             <details className="text-xs text-gray-500 dark:text-gray-400 mt-10 max-w-full overflow-hidden px-2">
                 <summary className="cursor-pointer font-medium">Debug: Context State</summary>
                 <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-[10px] overflow-auto max-h-96">
                     {JSON.stringify(state, (key, value) => typeof value === 'bigint' ? value.toString() : value , 2)}
                 </pre>
            </details>
        </div>
    );
}

export default App;