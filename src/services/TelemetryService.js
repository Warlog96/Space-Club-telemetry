class TelemetryService {
  constructor() {
    this.socket = null;
    this.subscribers = [];
    this.state = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return;

    // By default, try to connect to localhost first (this works when you open Netlify on the laptop itself)
    let wsUrl = 'ws://localhost:3000';
    
    // If we are explicitly loaded from a local network IP (e.g., http://192.168.1.5:5173), use that IP
    const host = window.location.hostname;
    if (host.match(/^[0-9.]+$/) && host !== '127.0.0.1') {
        wsUrl = `ws://${host}:3000`;
    }

    // Allow overriding from environment variables if deployed with an ngrok url
    if (import.meta.env && import.meta.env.VITE_WS_URL) {
        wsUrl = import.meta.env.VITE_WS_URL;
    }

    // Optional: If you want to connect from a mobile device on Netlify, you can type your laptop's IP here manually
    // uncomment the line below and replace with your laptop's IP to hardcode it for mobile Netlify testing:
    // wsUrl = 'ws://172.22.38.23:3000';

    console.log(`[TelemetryService] Connecting to WebSocket at ${wsUrl}...`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[TelemetryService] Connected');
      this.isConnected = true;
    };

    this.socket.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        this.state = packet;
        this.emit(packet);
      } catch (e) {
        console.error('Invalid Telemetry JSON:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[TelemetryService] Disconnected');
      this.isConnected = false;
      this.socket = null;
      // Reconnect logic could go here
      setTimeout(() => this.connect(), 2000);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  emit(packet) {
    this.subscribers.forEach(cb => cb(packet));
  }
}

export const telemetryService = new TelemetryService();
