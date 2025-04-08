// src/utils/formatting.js

// Assumes price has 8 decimals, adjust if necessary
const PRICE_DECIMALS = 8;

export const formatPrice = (priceStr) => {
    // Handle null, undefined, empty string, or explicit "0" before trying BigInt
    if (!priceStr || priceStr === "0" || priceStr === "-1") return "N/A";
    try {
        const priceBigInt = BigInt(priceStr);
        // Handle zero price after conversion
        if (priceBigInt === 0n) return "$0.00000000"; // Or simply "N/A" or "$0.00" depending on preference

        const divisor = BigInt(10**PRICE_DECIMALS);
        const integerPart = priceBigInt / divisor;
        const fractionalPart = priceBigInt % divisor;
        // Ensure fractional part is positive for formatting if price was negative
        const absoluteFractionalPart = fractionalPart < 0n ? -fractionalPart : fractionalPart;
        const fractionalString = absoluteFractionalPart.toString().padStart(PRICE_DECIMALS, '0');
        return `$${integerPart}.${fractionalString}`;
    } catch (e) {
        console.error("Error formatting price:", priceStr, e);
        return "Invalid";
    }
};

export const formatBigIntTimestamp = (timestampBigInt) => {
    if (!timestampBigInt) return 'N/A';
    try {
        // Convert BigInt timestamp (seconds) to milliseconds for Date object
        const timestampMs = Number(BigInt(timestampBigInt) * 1000n);
         if (isNaN(timestampMs)) return 'Invalid Date'; // Check after conversion
        return new Date(timestampMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); // Example format
    } catch (e) {
        console.error("Error formatting timestamp:", timestampBigInt, e);
        return 'Invalid Date';
    }
};

export function formatCountdown(seconds ) {
    if (seconds === null || seconds < 0 || isNaN(seconds)) {
        return '00:00';
    }
    const totalSeconds = Math.round(seconds); 
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}


export function formatPayout(poolAmountStr, otherPoolAmountStr) {
    if (!poolAmountStr || !otherPoolAmountStr) return '0.00';
    try {
        const pool = BigInt(poolAmountStr);
        const otherPool = BigInt(otherPoolAmountStr);
        if (pool === 0n) return '0.00'; 
        const totalPool = pool + otherPool;
        if (totalPool === 0n) return '0.00';

       
        const payoutRatio = (totalPool * 100n) / pool;
        const payoutInteger = payoutRatio / 100n;
        const payoutFractional = payoutRatio % 100n;

        return `${payoutInteger}.${payoutFractional.toString().padStart(2, '0')}`;

    } catch (e) {
         console.error("Error calculating payout", e);
         return 'ERR';
    }
}