import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: 'realtime' })
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  emitTelemetry(payload: unknown) {
    this.server.emit('telemetry.updated', payload);
  }

  emitCommand(payload: unknown) {
    this.server.emit('command.updated', payload);
  }

  emitAlert(payload: unknown) {
    this.server.emit('alert.created', payload);
  }
}
