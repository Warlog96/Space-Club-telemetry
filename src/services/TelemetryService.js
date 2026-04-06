class TelemetryService {
  constructor() {
    this.socket = null;
    this.subscribers = [];
    this.state = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket) return;

    console.log('[TelemetryService] Connecting to WebSocket...');
    this.socket = new WebSocket('ws://localhost:3000');

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
