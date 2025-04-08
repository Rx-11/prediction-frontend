import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    useCallback,
    useRef,
    useMemo
} from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useAPI';

const PRICE_FETCH_INTERVAL = 10000;
const DEFAULT_INTERVAL_SECONDS = 300;

const initialRoundData = {
    epoch: null, status: 'Loading', startTimestamp: null, lockTimestamp: null, closeTimestamp: null,
    lockPrice: null, closePrice: null, totalAmount: null, bullAmount: null, bearAmount: null,
};

const initialState = {
    rounds: {}, latestEpoch: null, currentPrice: null,
    connectionStatus: 'Connecting', lastMessageRaw: null,
    contractIntervalSeconds: DEFAULT_INTERVAL_SECONDS,
};

const RoundContext = createContext({
    state: initialState,
    liveEpoch: null,
    processingEpoch: null,
    fetchRound: async () => null
});

export const useRoundContext = () => useContext(RoundContext);

export const RoundProvider = ({ children }) => {
    const [state, setState] = useState(initialState);
    const { lastMessage, isConnected, error: wsError } = useWebSocket();
    const { getRoundDetails, getCurrentPrice } = useApi();

    const derivedEpochs = useMemo(() => {
        if (!state.rounds || typeof state.rounds !== 'object') {
            return { liveEpoch: null, processingEpoch: null };
        }
        const rounds = state.rounds;
        let live = null; let processing = null;
        const sortedEpochs = Object.keys(rounds)
            .filter(epochStr => rounds[epochStr]?.status && !['Waiting', 'Loading'].includes(rounds[epochStr].status))
            .sort((a, b) => Number(b) - Number(a));

        for (const epochStr of sortedEpochs) {
            const round = rounds[epochStr];
            if (!round) continue;
            if (round.status === 'Started' && live === null) live = epochStr;
            if (['Locked', 'ProcessingLock', 'ProcessingClose'].includes(round.status) && processing === null) processing = epochStr;
            if (live !== null && processing !== null && processing >= live) break;
        }
        return { liveEpoch: live, processingEpoch: processing };
    }, [state.rounds]);

    const fetchRoundAndUpdateState = useCallback(async (epoch) => {
        if (!epoch) return;
        const epochStr = String(epoch);

        setState(prev => {
            const safePrevRounds = prev.rounds || {};
            const previousDataForCatch = safePrevRounds[epochStr] || { ...initialRoundData, epoch: epochStr };
            return {
                ...prev,
                rounds: { ...safePrevRounds, [epochStr]: { ...previousDataForCatch, status: 'Loading' } }
            };
        });

        try {
            const data = await getRoundDetails(epochStr);
            if (!data || !data.epoch) throw new Error(`Invalid or empty data received from API for epoch ${epochStr}`);

            let status = 'Waiting';
            const now = Date.now() / 1000;

            // Safely convert timestamps to BigInt, using 0n as fallback
            const start = data.startTimestamp != null ? BigInt(data.startTimestamp) : 0n;
            const lock = data.lockTimestamp != null ? BigInt(data.lockTimestamp) : 0n;
            const close = data.closeTimestamp != null ? BigInt(data.closeTimestamp) : 0n;

            const lockPriceSet = data.lockPrice && data.lockPrice !== "0";
            const closePriceSet = data.closePrice && data.closePrice !== "0";

            if (start > 0n) {
                if (closePriceSet) status = 'Closed';
                else if (lockPriceSet) status = (close > 0n && now > Number(close)) ? 'ProcessingClose' : 'Locked';
                else status = (lock > 0n && now > Number(lock)) ? 'ProcessingLock' : 'Started';
            }

            setState(prev => {
                const newLatestEpoch = prev.latestEpoch === null || BigInt(epochStr) > BigInt(prev.latestEpoch) ? epochStr : prev.latestEpoch;
                const safePrevRounds = prev.rounds || {};
                return {
                    ...prev,
                    rounds: {
                        ...safePrevRounds,
                        [epochStr]: {
                            epoch: epochStr, status: status,
                            // Store null if original value was null/undefined (BigInt value is 0n)
                            startTimestamp: start > 0n ? start : null,
                            lockTimestamp: lock > 0n ? lock : null,
                            closeTimestamp: close > 0n ? close : null,
                            // Store prices/amounts as strings or null
                            lockPrice: data.lockPrice || null,
                            closePrice: data.closePrice || null,
                            totalAmount: data.totalAmount || null,
                            bullAmount: data.bullAmount || null,
                            bearAmount: data.bearAmount || null,
                        },
                    },
                    latestEpoch: newLatestEpoch,
                };
            });
        } catch (err) {
            console.error(`[Context] Failed fetch/process round ${epochStr} via API:`, err);
            setState(prev => {
                const safePrevRounds = prev.rounds || {};
                const roundDataBeforeFetchAttempt = safePrevRounds[epochStr] || { ...initialRoundData, epoch: epochStr };
                return {
                    ...prev,
                    rounds: { ...safePrevRounds, [epochStr]: { ...roundDataBeforeFetchAttempt, status: 'Error' } }
                };
            });
        }
    }, [getRoundDetails]);

    const fetchRoundRef = useRef(fetchRoundAndUpdateState);
    useEffect(() => {
        fetchRoundRef.current = fetchRoundAndUpdateState;
    }, [fetchRoundAndUpdateState]);

    const fetchInitialState = useCallback(async () => {
        setState(prev => ({ ...prev, connectionStatus: 'Initializing' }));
        try {
            const priceData = await getCurrentPrice();
            setState(prev => ({ ...prev, currentPrice: priceData.price, connectionStatus: 'Connected' }));
        } catch (err) {
            console.error("[Context] Failed initial price fetch:", err);
            setState(prev => ({ ...prev, connectionStatus: 'Connected' }));
        }
    }, [getCurrentPrice]);
    useEffect(() => { fetchInitialState(); }, [fetchInitialState]);

    useEffect(() => {
        let intervalId = null;
        const fetchPrice = async () => {
            try {
                const priceData = await getCurrentPrice();
                setState(prev => ({ ...prev, currentPrice: priceData.price }));
            } catch (err) { console.error("[Context] Failed periodic price fetch:", err); }
        };
        if (isConnected) {
             fetchPrice();
             intervalId = setInterval(fetchPrice, PRICE_FETCH_INTERVAL);
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isConnected, getCurrentPrice]);

    useEffect(() => {
        let newConnectionStatus = state.connectionStatus;
         if (wsError && newConnectionStatus !== 'Error') newConnectionStatus = 'Error';
         else if (isConnected && !['Connected', 'Initializing'].includes(newConnectionStatus)) newConnectionStatus = 'Connected';
         else if (!isConnected && newConnectionStatus === 'Connected') newConnectionStatus = 'Disconnected';
        setState(prev => prev.connectionStatus !== newConnectionStatus ? { ...prev, connectionStatus: newConnectionStatus } : prev);

        if (lastMessage) {
            const { type, payload } = lastMessage;
            const epoch = payload?.epoch;

            setState(prev => ({ ...prev, lastMessageRaw: lastMessage }));

            if (epoch) {
                const epochStr = String(epoch);
                let triggerApiFetch = false;
                let newLatestEpoch = state.latestEpoch;
                let immediateStatusUpdate = null;

                if (type === 'round_started') {
                     immediateStatusUpdate = 'Started'; triggerApiFetch = true;
                     if (state.latestEpoch === null || BigInt(epochStr) > BigInt(state.latestEpoch)) newLatestEpoch = epochStr;
                } else if (type === 'round_locked') { immediateStatusUpdate = 'Locked'; triggerApiFetch = true; }
                else if (type === 'round_closed') { immediateStatusUpdate = 'Closed'; triggerApiFetch = true; }
                else if (type.includes('_failed')) { immediateStatusUpdate = 'Error'; triggerApiFetch = false; }

                if (newLatestEpoch !== state.latestEpoch) {
                     setState(prev => ({ ...prev, latestEpoch: newLatestEpoch }));
                }

                 if (immediateStatusUpdate) {
                     setState(prev => {
                         const safeRounds = prev.rounds || {};
                         const existingRound = safeRounds[epochStr] || { ...initialRoundData, epoch: epochStr };
                         return { ...prev, rounds: { ...safeRounds, [epochStr]: { ...existingRound, status: immediateStatusUpdate } } };
                     });
                 }

                if (triggerApiFetch) {
                    // Use timeout to allow immediate state update to process first
                    setTimeout(() => fetchRoundRef.current(epochStr), 0);
                }

            } else if (type === 'price_update') {
                 setState(prev => ({ ...prev, currentPrice: payload?.price }));
            }
        }
    }, [lastMessage, isConnected, wsError, state.latestEpoch]);

    return (
        <RoundContext.Provider value={{
             state,
             liveEpoch: derivedEpochs.liveEpoch,
             processingEpoch: derivedEpochs.processingEpoch,
             fetchRound: fetchRoundAndUpdateState
        }}>
            {children}
        </RoundContext.Provider>
    );
};