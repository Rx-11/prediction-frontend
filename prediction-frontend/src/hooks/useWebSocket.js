import { useState, useEffect, useRef, useCallback } from 'react';


const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws/updates';
const RECONNECT_DELAY = 5000; 

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [error, setError] = useState(null);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket already open or connecting.');
            setIsConnected(socketRef.current.readyState === WebSocket.OPEN);
            return;
        }

        console.log(`Attempting to connect WebSocket to ${WEBSOCKET_URL}...`);
        setError(null);

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        
         if (reconnectTimeoutRef.current) {
             clearTimeout(reconnectTimeoutRef.current);
             reconnectTimeoutRef.current = null;
         }

        try {
             const socket = new WebSocket(WEBSOCKET_URL);
             socketRef.current = socket;

             socket.onopen = () => {
                 console.log('WebSocket connection established.');
                 setIsConnected(true);
                 setError(null);
                 if (reconnectTimeoutRef.current) {
                     clearTimeout(reconnectTimeoutRef.current);
                     reconnectTimeoutRef.current = null;
                 }
             };

             socket.onmessage = (event) => {
                 try {
                     const messageData = JSON.parse(event.data);
                     if (messageData && typeof messageData === 'object' && typeof messageData.type === 'string') {
                         console.log('WebSocket message received:', messageData);
                         setLastMessage(messageData);
                     } else {
                          console.warn('Received invalid WebSocket message structure:', event.data);
                     }
                 } catch (e) {
                     console.error('Failed to parse WebSocket message:', e);
                 }
             };

             socket.onerror = (event) => {
                 console.error('WebSocket error:', event);
                 setError(event);
             };

             socket.onclose = (event) => {
                 console.log(`WebSocket connection closed: Code=${event.code}, Reason=${event.reason}`);
                 setIsConnected(false);
                 if (socketRef.current === socket) { 
                 }

                 
                 if (!event.wasClean && event.code !== 1000) { 
                     console.log(`WebSocket closed unexpectedly. Reconnecting in ${RECONNECT_DELAY / 1000}s...`);
                      if (reconnectTimeoutRef.current) {
                          clearTimeout(reconnectTimeoutRef.current);
                      }
                     reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
                 }
             };
        } catch (err) {
            console.error("Failed to create WebSocket:", err);
            setError(err);
             
             if (reconnectTimeoutRef.current) {
                 clearTimeout(reconnectTimeoutRef.current);
             }
             reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
    }, []); 

    const disconnect = useCallback(() => {
         if (reconnectTimeoutRef.current) {
             clearTimeout(reconnectTimeoutRef.current);
             reconnectTimeoutRef.current = null;
         }
        if (socketRef.current) {
            console.log("Closing WebSocket connection intentionally.");
            socketRef.current.close(1000, "Client disconnected");
            socketRef.current = null; 
            setIsConnected(false);
         }
     }, []);

    
    useEffect(() => {
        connect(); 

        return () => {
            disconnect(); 
        };
    }, [connect, disconnect]); 

    return { isConnected, lastMessage, error, connect, disconnect };
}