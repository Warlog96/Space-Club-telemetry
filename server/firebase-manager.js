/**
 * Firebase Manager - Handles all Firebase Realtime Database operations
 * Provides session-based storage and data cleanup utilities
 */

const admin = require('firebase-admin');

class FirebaseManager {
    constructor(db) {
        this.db = db;
        this.currentSessionId = null;
        this.sessionMetadata = null;
    }

    /**
     * Generate session ID from current timestamp
     * Format: session_YYYY-MM-DD_HH-MM-SS
     */
    generateSessionId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `session_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    }

    /**
     * Create a new session in Firebase with metadata
     */
    async createSession() {
        if (!this.db) {
            console.warn('[Firebase Manager] Database not initialized, skipping session creation');
            return null;
        }

        this.currentSessionId = this.generateSessionId();
        this.sessionMetadata = {
            serverStartTime: new Date().toISOString(),
            serverStartTimestamp: Date.now(),
            description: 'Server session started',
            timezone: 'Asia/Kolkata'
        };

        try {
            const sessionRef = this.db.ref(`sessions/${this.currentSessionId}/metadata`);
            await sessionRef.set(this.sessionMetadata);
            console.log(`[Firebase Manager] Session created: ${this.currentSessionId}`);
            console.log(`[Firebase Manager] Session metadata saved to Firebase`);
            return this.currentSessionId;
        } catch (error) {
            console.error('[Firebase Manager] Error creating session:', error.message);
            return null;
        }
    }

    /**
     * Get the current session ID
     */
    getCurrentSessionId() {
        return this.currentSessionId;
    }

    /**
     * Save telemetry data to current session
     */
    async saveTelemetry(packet) {
        if (!this.db || !this.currentSessionId) {
            return false;
        }

        if (!packet.timestamp_ms) {
            console.warn('[Firebase Manager] Packet missing timestamp_ms, skipping save');
            return false;
        }

        try {
            const telemetryRef = this.db.ref(
                `sessions/${this.currentSessionId}/telemetry/${packet.timestamp_ms}`
            );
            await telemetryRef.set(packet);
            return true;
        } catch (error) {
            console.error('[Firebase Manager] Error saving telemetry:', error.message);
            return false;
        }
    }

    /**
     * List all sessions from Firebase
     */
    async listSessions() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sessionsRef = this.db.ref('sessions');
            const snapshot = await sessionsRef.once('value');
            const sessionsData = snapshot.val();

            if (!sessionsData) {
                return [];
            }

            const sessions = [];
            for (const [sessionId, sessionData] of Object.entries(sessionsData)) {
                const metadata = sessionData.metadata || {};
                const telemetryCount = sessionData.telemetry
                    ? Object.keys(sessionData.telemetry).length
                    : 0;

                sessions.push({
                    sessionId,
                    serverStartTime: metadata.serverStartTime,
                    serverStartTimestamp: metadata.serverStartTimestamp,
                    description: metadata.description,
                    telemetryPackets: telemetryCount
                });
            }

            // Sort by timestamp, newest first
            sessions.sort((a, b) => b.serverStartTimestamp - a.serverStartTimestamp);
            return sessions;
        } catch (error) {
            console.error('[Firebase Manager] Error listing sessions:', error.message);
            throw error;
        }
    }

    /**
     * Get data for a specific session
     */
    async getSessionData(sessionId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sessionRef = this.db.ref(`sessions/${sessionId}`);
            const snapshot = await sessionRef.once('value');
            const sessionData = snapshot.val();

            if (!sessionData) {
                return null;
            }

            return {
                sessionId,
                metadata: sessionData.metadata || {},
                telemetry: sessionData.telemetry || {},
                telemetryCount: sessionData.telemetry
                    ? Object.keys(sessionData.telemetry).length
                    : 0
            };
        } catch (error) {
            console.error('[Firebase Manager] Error getting session data:', error.message);
            throw error;
        }
    }

    /**
     * Delete a specific session from Firebase
     */
    async deleteSession(sessionId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sessionRef = this.db.ref(`sessions/${sessionId}`);
            await sessionRef.remove();
            console.log(`[Firebase Manager] Session deleted: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('[Firebase Manager] Error deleting session:', error.message);
            throw error;
        }
    }

    /**
     * Clear all data from Firebase (DESTRUCTIVE)
     */
    async clearAllData() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const rootRef = this.db.ref('/');
            await rootRef.remove();
            console.log('[Firebase Manager] All data cleared from Firebase');
            return true;
        } catch (error) {
            console.error('[Firebase Manager] Error clearing all data:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup mock/test sessions
     * Removes sessions older than specified hours or marked as test
     */
    async cleanupMockData(olderThanHours = 24) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const sessions = await this.listSessions();
            const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
            const deletedSessions = [];

            for (const session of sessions) {
                // Delete if older than cutoff or description contains "test" or "mock"
                const isOld = session.serverStartTimestamp < cutoffTime;
                const isTest = session.description &&
                    (session.description.toLowerCase().includes('test') ||
                        session.description.toLowerCase().includes('mock'));

                if (isOld || isTest) {
                    await this.deleteSession(session.sessionId);
                    deletedSessions.push(session.sessionId);
                }
            }

            console.log(`[Firebase Manager] Cleaned up ${deletedSessions.length} mock/old sessions`);
            return deletedSessions;
        } catch (error) {
            console.error('[Firebase Manager] Error cleaning up mock data:', error.message);
            throw error;
        }
    }

    /**
     * Delete old missions data (legacy structure cleanup)
     */
    async deleteLegacyMissions() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const missionsRef = this.db.ref('missions');
            await missionsRef.remove();
            console.log('[Firebase Manager] Legacy missions data deleted');
            return true;
        } catch (error) {
            console.error('[Firebase Manager] Error deleting legacy missions:', error.message);
            throw error;
        }
    }
}

module.exports = FirebaseManager;
