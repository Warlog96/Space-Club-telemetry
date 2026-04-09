import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, limitToLast, orderByChild, startAt } from 'firebase/database';

// Firebase configuration (public read-only)
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDcnnG9oHHmC4rC7NgiqeBiIvaHxlRRQHQ",
    authDomain: "test-d0075.firebaseapp.com",
    databaseURL: "https://test-d0075-default-rtdb.firebaseio.com",
    projectId: "test-d0075",
    storageBucket: "test-d0075.firebasestorage.app",
    messagingSenderId: "292384353842",
    appId: "1:292384353842:web:f0960cb3c29085e44fd62b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Hybrid Data Service
 * Combines WebSocket (fast, live) with Firebase (reliable, persistent)
 * Ensures seamless data delivery with no interruptions
 */
class HybridDataService {
    constructor() {
        this.data = [];
        this.lastTimestamp = 0;
        this.wsConnected = false;
        this.firebaseConnected = false;
        this.listeners = new Set();
        this.ws = null;
        this.syncInterval = null;
        this.reconnectTimeout = null;
    }

    /**
     * Initialize the service
     * Step 1: Load historical data from Firebase
     * Step 2: Connect to WebSocket for live updates
     * Step 3: Start background sync checker
     */
    async initialize() {
        console.log('[HybridService] Initializing...');

        try {
            // Step 1: Load initial data from Firebase
            await this.loadHistoricalData();

            // Step 2: Connect to WebSocket
            this.connectWebSocket();

            // Step 3: Start sync checker (runs every 30 seconds)
            this.startSyncChecker();

            console.log('[HybridService] Initialization complete');
        } catch (error) {
            console.error('[HybridService] Initialization error:', error);
            // Even if Firebase fails, try WebSocket
            this.connectWebSocket();
        }
    }

    /**
     * Load historical data from Firebase
     * Fetches last 100 telemetry packets
     */
    async loadHistoricalData() {
        console.log('[HybridService] Loading historical data from Firebase...');

        return new Promise((resolve, reject) => {
            const telemetryRef = ref(database, 'telemetry');
            const recentQuery = query(telemetryRef, limitToLast(100));

            // Use 'once' for initial load (not continuous subscription)
            onValue(recentQuery, (snapshot) => {
                const firebaseData = snapshot.val();

                if (firebaseData) {
                    // Convert object to array and sort by timestamp
                    this.data = Object.values(firebaseData).sort(
                        (a, b) => a.timestamp_ms - b.timestamp_ms
                    );

                    this.lastTimestamp = this.getLatestTimestamp();
                    this.firebaseConnected = true;

                    console.log(`[HybridService] Loaded ${this.data.length} packets from Firebase`);
                    console.log(`[HybridService] Latest timestamp: ${this.lastTimestamp}`);

                    // Notify listeners with initial data
                    this.notifyListeners();
                    resolve();
                } else {
                    console.warn('[HybridService] No data in Firebase');
                    this.data = [];
                    resolve();
                }
            }, (error) => {
                console.error('[HybridService] Firebase error:', error);
                this.firebaseConnected = false;
                reject(error);
            }, { onlyOnce: true });
        });
    }

    /**
     * Connect to WebSocket for live updates
     * Automatically reconnects on disconnect
     */
    connectWebSocket() {
        // Use environment variable or fallback to localhost
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

        console.log('[HybridService] Connecting to WebSocket:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.wsConnected = true;
                console.log('[HybridService] WebSocket connected');
                this.notifyConnectionStatus();
            };

            this.ws.onmessage = (event) => {
                try {
                    const newData = JSON.parse(event.data);
                    this.handleNewData(newData);
                } catch (error) {
                    console.error('[HybridService] Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[HybridService] WebSocket error:', error);
            };

            this.ws.onclose = () => {
                this.wsConnected = false;
                console.log('[HybridService] WebSocket disconnected, will reconnect in 5s');
                this.notifyConnectionStatus();

                // Attempt reconnection after 5 seconds
                this.reconnectTimeout = setTimeout(() => {
                    this.connectWebSocket();
                }, 5000);
            };
        } catch (error) {
            console.error('[HybridService] WebSocket connection error:', error);
            this.wsConnected = false;
        }
    }

    /**
     * Handle new data from WebSocket
     * Only adds data newer than our last timestamp
     */
    handleNewData(newData) {
        // Validate data has timestamp
        if (!newData.timestamp_ms) {
            console.warn('[HybridService] Received data without timestamp');
            return;
        }

        // Only add if newer than our last data (prevent duplicates)
        if (newData.timestamp_ms > this.lastTimestamp) {
            this.data.push(newData);
            this.lastTimestamp = newData.timestamp_ms;

            // Keep only last 500 packets in memory (prevent memory bloat)
            if (this.data.length > 500) {
                this.data = this.data.slice(-500);
            }

            // Notify all listeners
            this.notifyListeners(newData);
        }
    }

    /**
     * Background sync checker
     * Runs every 30 seconds to fill any gaps from Firebase
     */
    startSyncChecker() {
        console.log('[HybridService] Starting background sync checker');

        this.syncInterval = setInterval(async () => {
            // Only sync if we have a last timestamp
            if (this.lastTimestamp === 0) return;

            try {
                console.log('[HybridService] Running sync check...');

                const telemetryRef = ref(database, 'telemetry');
                const newDataQuery = query(
                    telemetryRef,
                    orderByChild('timestamp_ms'),
                    startAt(this.lastTimestamp + 1)
                );

                onValue(newDataQuery, (snapshot) => {
                    const missedData = snapshot.val();

                    if (missedData) {
                        const missedArray = Object.values(missedData).sort(
                            (a, b) => a.timestamp_ms - b.timestamp_ms
                        );

                        if (missedArray.length > 0) {
                            console.log(`[HybridService] Synced ${missedArray.length} missed packets from Firebase`);

                            // Add missed data
                            this.data.push(...missedArray);
                            this.lastTimestamp = this.getLatestTimestamp();

                            // Keep only last 500 packets
                            if (this.data.length > 500) {
                                this.data = this.data.slice(-500);
                            }

                            // Notify listeners
                            this.notifyListeners();
                        }
                    }
                }, { onlyOnce: true });
            } catch (error) {
                console.error('[HybridService] Sync check error:', error);
            }
        }, 30000); // Every 30 seconds
    }

    /**
     * Get the latest timestamp from our data
     */
    getLatestTimestamp() {
        if (this.data.length === 0) return 0;
        return Math.max(...this.data.map(d => d.timestamp_ms || 0));
    }

    /**
     * Get current data
     */
    getData() {
        return this.data;
    }

    /**
     * Get latest packet
     */
    getLatestPacket() {
        return this.data.length > 0 ? this.data[this.data.length - 1] : null;
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            websocket: this.wsConnected,
            firebase: this.firebaseConnected,
            isConnected: this.wsConnected || this.firebaseConnected,
            dataSource: this.wsConnected ? 'WebSocket (Live)' :
                this.firebaseConnected ? 'Firebase (Synced)' :
                    'Disconnected'
        };
    }

    /**
     * Subscribe to data updates
     */
    subscribe(callback) {
        this.listeners.add(callback);

        // Immediately call with current data
        callback({
            packet: this.getLatestPacket(),
            history: this.getData(),
            status: this.getConnectionStatus()
        });

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    /**
     * Notify all listeners of data update
     */
    notifyListeners(newPacket = null) {
        const update = {
            packet: newPacket || this.getLatestPacket(),
            history: this.getData(),
            status: this.getConnectionStatus()
        };

        this.listeners.forEach(callback => {
            try {
                callback(update);
            } catch (error) {
                console.error('[HybridService] Listener error:', error);
            }
        });
    }

    /**
     * Notify listeners of connection status change
     */
    notifyConnectionStatus() {
        this.notifyListeners();
    }

    /**
     * Cleanup on unmount
     */
    destroy() {
        console.log('[HybridService] Shutting down...');

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Clear intervals
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Clear listeners
        this.listeners.clear();

        console.log('[HybridService] Shutdown complete');
    }
}

// Export singleton instance
const hybridDataService = new HybridDataService();

export default hybridDataService;
