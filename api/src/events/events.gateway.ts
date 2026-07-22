import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitObjectCreated(payload: unknown): void {
    this.server.emit('object:created', payload);
  }

  emitObjectDeleted(id: string): void {
    this.server.emit('object:deleted', { id });
  }
}
