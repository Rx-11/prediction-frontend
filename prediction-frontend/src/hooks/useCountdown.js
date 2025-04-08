// src/hooks/useCountdown.js
import { useState, useEffect } from 'react';

// Calculates remaining time in seconds until a target timestamp (BigInt or null/undefined in seconds)
// Export the hook using 'export function'
export function useCountdown(targetTimestamp /* BigInt | null | undefined */) {
    const [remainingSeconds, setRemainingSeconds] = useState(null);

    useEffect(() => {
        let intervalId = null;
        const cleanup = () => { if (intervalId) clearInterval(intervalId); };

        if (targetTimestamp === null || targetTimestamp === undefined) {
            setRemainingSeconds(null);
            return cleanup;
        }

        const calculateRemaining = () => {
            try {
                 const targetSec = Number(BigInt(targetTimestamp));
                 const nowSec = Date.now() / 1000;
                 const diff = Math.max(0, Math.floor(targetSec - nowSec));
                 setRemainingSeconds(diff);
                 if (diff === 0 && intervalId) { clearInterval(intervalId); intervalId = null; }
            } catch(e) {
                console.error("Error calculating countdown:", e, "Target:", targetTimestamp);
                setRemainingSeconds(null);
                 if (intervalId) clearInterval(intervalId); intervalId = null;
            }
        };

        calculateRemaining();
         if (remainingSeconds === null || remainingSeconds > 0) { // Check state variable correctly
            intervalId = setInterval(calculateRemaining, 1000);
         }

        return cleanup;
    }, [targetTimestamp]); // Dependency array is correct

    // Need to return state from useEffect calculation
    return remainingSeconds;
}

// Helper to format seconds into MM:SS
// Export this function using 'export function' or 'export const'
export function formatCountdown(seconds /* number | null */) {
    if (seconds === null || seconds < 0 || isNaN(seconds)) {
        return '00:00';
    }
    const totalSeconds = Math.round(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}