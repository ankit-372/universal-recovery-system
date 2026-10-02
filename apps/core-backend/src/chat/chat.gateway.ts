import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Conversation } from './conversation.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '../auth/session.service';
import { createWsJwtMiddleware } from './ws-jwt.middleware';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', /^https:\/\/.*\.onrender\.com$/],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> socketId
  private activeUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionService: SessionService,
  ) { }

  afterInit(server: Server) {
    // 🔒 Enforce JWT authentication on the WebSocket handshake
    server.use(
      createWsJwtMiddleware(this.jwtService, this.configService, this.sessionService),
    );
  }

  // --- Connection Handling ---
  handleConnection(client: Socket) {
    // Identity is derived ONLY from the verified JWT, never client query params
    const user = client.data?.user;
    if (!user || !user.id) {
      console.warn(`⚠️ Rejecting unauthenticated socket connection: ${client.id}`);
      client.disconnect();
      return;
    }

    const userId = user.id;
    this.activeUsers.set(userId, client.id);
    this.server.emit('user_status', { userId, status: 'online' });

    // Send the list of online users to the connecting client
    const onlineUserIds = Array.from(this.activeUsers.keys());
    client.emit('online_users', onlineUserIds);

    console.log(`🟢 User ${userId} (${user.email}) connected via authenticated WebSocket`);
  }

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    const userId = user?.id || [...this.activeUsers.entries()]
      .find(([_, socketId]) => socketId === client.id)?.[0];

    if (userId) {
      this.activeUsers.delete(userId);
      this.server.emit('user_status', { userId, status: 'offline' });
      console.log(`🔴 User ${userId} is Offline`);
    }
  }

  // --- Chat Features ---

  @SubscribeMessage('join_room')
  async handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.id;
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      // 🔒 Authorization check: Ensure client is a participant in this conversation before joining
      await this.chatService.verifyMembership(roomId, userId);
      client.join(roomId);
    } catch (err: any) {
      client.emit('error', { message: err.message || 'Cannot join room: Forbidden' });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: {
      conversationId: string;
      content: string;
      receiverId: string;
      itemId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // 🔒 Critical fix: Deriving senderId strictly from the authenticated socket session
    const senderId = client.data?.user?.id;
    if (!senderId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    let conversationId = payload.conversationId;
    let dbConversation: Conversation | null = null;

    try {
      // Verify caller has permission to send messages to this conversation
      const verifiedConv = await this.chatService.verifyMembership(conversationId, senderId);
      dbConversation = verifiedConv;
      conversationId = verifiedConv.id;
    } catch (err: any) {
      client.emit('error', { message: 'Forbidden: You cannot send messages to this conversation' });
      return;
    }

    // 2. Save Message via Service with server-derived senderId
    const savedMessage = await this.chatService.sendMessage(
      conversationId,
      senderId,
      payload.content,
    );

    // 3. Emit back to the Room
    this.server.to(payload.conversationId).emit('receive_message', {
      ...savedMessage,
      conversationId: payload.conversationId,
    });

    // 4. Notification
    const receiverSocketId = this.activeUsers.get(payload.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('notification', {
        type: 'message',
        from: senderId,
        content: payload.content,
        conversationId: payload.conversationId,
      });
    }
  }

  @SubscribeMessage('get_messages')
  async handleGetMessages(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data?.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const conv = await this.chatService.verifyMembership(roomId, userId);
      return this.chatService.getMessages(conv.id);
    } catch (err: any) {
      return { error: err.message || 'Forbidden' };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() payload: {
      messageId: string;
      conversationId: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    // 🔒 Deriving senderId strictly from authenticated socket session
    const senderId = client.data?.user?.id;
    if (!senderId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    try {
      await this.chatService.deleteMessage(senderId, payload.messageId);

      this.server.to(payload.conversationId).emit('message_deleted', {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
      });
    } catch (error: any) {
      console.error("Failed to delete message:", error.message);
      client.emit('error', { message: error.message });
    }
  }
}