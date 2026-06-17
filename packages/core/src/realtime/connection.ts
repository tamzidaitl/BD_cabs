import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

/**
 * Real-time is treated like the HTTP client: a platform-agnostic wrapper whose
 * concrete URL + token accessor are injected by the host. `@microsoft/signalr`
 * runs in both the browser and React Native (it negotiates WebSocket/SSE/long-
 * polling), so this exact module is reused by the future RN app.
 */
export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Public surface used by hooks — keeps signalr out of consumers' types. */
export interface RealtimeConnection {
  /** Subscribe to a server event. Returns an unsubscribe function. */
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
  invoke<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
  status(): RealtimeStatus;
}

export interface RealtimeConfig {
  /** Fully-qualified hub URL, e.g. https://api.bdcabs.com/hubs/rides */
  hubUrl: string;
  getAccessToken: () => string | null | undefined;
}

export function createRealtimeConnection(config: RealtimeConfig): RealtimeConnection {
  const connection = new HubConnectionBuilder()
    .withUrl(config.hubUrl, {
      accessTokenFactory: () => config.getAccessToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  return {
    on(event, handler) {
      const wrapped = (...args: unknown[]) => handler(args[0] as never);
      connection.on(event, wrapped);
      return () => connection.off(event, wrapped);
    },
    async start() {
      if (connection.state === HubConnectionState.Disconnected) {
        await connection.start();
      }
    },
    async stop() {
      if (connection.state !== HubConnectionState.Disconnected) {
        await connection.stop();
      }
    },
    invoke(method, ...args) {
      return connection.invoke(method, ...args);
    },
    status() {
      switch (connection.state) {
        case HubConnectionState.Connected:
          return 'connected';
        case HubConnectionState.Connecting:
          return 'connecting';
        case HubConnectionState.Reconnecting:
          return 'reconnecting';
        default:
          return 'disconnected';
      }
    },
  };
}
