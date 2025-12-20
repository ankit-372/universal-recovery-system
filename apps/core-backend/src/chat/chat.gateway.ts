import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Conversation } from './conversation.entity';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: userId -> socketId
  private activeUsers = new Map<string, string>();

  constructor(
    private chatService: ChatService
  ) { }

  // --- Connection Handling ---
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.activeUsers.set(userId, client.id);
      this.server.emit('user_status', { userId, status: 'online' });

      // Send the list of online users to the connecting client
      const onlineUserIds = Array.from(this.activeUsers.keys());
      client.emit('online_users', onlineUserIds);

      console.log(`🟢 User ${userId} is Online`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.activeUsers.entries()]
      .find(([_, socketId]) => socketId === client.id)?.[0];

    if (userId) {
      this.activeUsers.delete(userId);
      this.server.emit('user_status', { userId, status: 'offline' });
      console.log(`🔴 User ${userId} is Offline`);
    }
  }

  // --- Chat Features ---

  @SubscribeMessage('join_room')
  handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    // Client joins the string-based room ID for real-time updates
    client.join(roomId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(@MessageBody() payload: {
    conversationId: string;
    content: string;
    senderId: string;
    receiverId: string;
    itemId?: string;
  }) {
    let conversationId = payload.conversationId;

    // 1. Logic Check: Do we need to create/find conversation first?
    // Since we moved DB logic to Service, we can try to "ensure" conversation there.
    // But Service methods are granular.
    // For now, let's keep the "Legacy ID parsing" here or move it to a helper.
    // Ideally, the Service should have a "ensureConversation" method.

    const isLegacyId = payload.conversationId.startsWith('chat_item_');
    let dbConversation: Conversation | null = null;

    if (isLegacyId) {
      // chat_item_ITEMID_finder_FINDERID_seeker_SEEKERID
      const parts = payload.conversationId.split('_');
      const itemId = parts[2];
      const finderId = parts[4];
      const seekerId = parts[6];

      // Use Service to get/create
      dbConversation = await this.chatService.startConversation(finderId, seekerId, itemId);
      if (dbConversation) conversationId = dbConversation.id;
    }

    if (!dbConversation && !isLegacyId) {
      // It's already a UUID, just save message
      // But wait, the service's sendMessage takes a conversation ID UUID.
      // perfect.
    }

    // 2. Save Message via Service
    // If we failed to get a DB conversation, we can't save.
    // But startConversation should return one.

    const savedMessage = await this.chatService.sendMessage(
      dbConversation ? dbConversation.id : conversationId,
      payload.senderId,
      payload.content
    );

    // 3. Emit back to the Room (using the ID the client knows)
    this.server.to(payload.conversationId).emit('receive_message', {
      ...savedMessage,
      conversationId: payload.conversationId
    });

    // 4. Notification
    const receiverSocketId = this.activeUsers.get(payload.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('notification', {
        type: 'message',
        from: payload.senderId,
        content: payload.content,
        conversationId: payload.conversationId
      });
    }
  }

  @SubscribeMessage('get_messages')
  async handleGetMessages(@MessageBody() roomId: string) {
    // Logic to fetch messages.
    if (roomId.startsWith('chat_item_')) {
      const parts = roomId.split('_');
      const itemId = parts[2];
      const finderId = parts[4];
      const seekerId = parts[6];

      const conversation = await this.chatService.startConversation(finderId, seekerId, itemId);
      if (!conversation) return [];

      return this.chatService.getMessages(conversation.id);
    }

    return this.chatService.getMessages(roomId);
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(@MessageBody() payload: {
    messageId: string;
    conversationId: string;
    senderId: string;
  }) {
    // 1. Delete in DB
    try {
      await this.chatService.deleteMessage(payload.senderId, payload.messageId);

      // 2. Broadcast to Room
      this.server.to(payload.conversationId).emit('message_deleted', {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
      });

    } catch (error) {
      console.error("Failed to delete message:", error.message);
      // Optional: Emit error back to sender
    }
  }
}