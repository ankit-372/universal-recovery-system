import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';
import { Message } from './message.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepo: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepo: Repository<Message>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    // 1. Start a new chat (When a match is found)
    async startConversation(finderId: string, receiverId: string, itemId: string) {
        // Check if conversation already exists to avoid duplicates
        // We check both directions because "A found B's item" is the same convo regardless of who starts it,
        // although strictly speaking 'finder' and 'receiver' are roles.
        // For now, we assume strict roles: Finder is the one who found it.
        const existing = await this.conversationRepo.findOne({
            where: [
                { finder: { id: finderId }, receiver: { id: receiverId }, itemId },
            ],
            relations: ['finder', 'receiver']
        });
        if (existing) return existing;

        const finder = await this.userRepo.findOneBy({ id: finderId });
        const receiver = await this.userRepo.findOneBy({ id: receiverId });

        if (!finder || !receiver) throw new Error("User not found");

        const conv = this.conversationRepo.create({
            finder,
            receiver,
            itemId,
        });
        return this.conversationRepo.save(conv);
    }

    // 2. Save a Message (So we can see it later)
    async sendMessage(conversationId: string, senderId: string, content: string) {
        const message = this.messageRepo.create({
            conversation: { id: conversationId },
            sender: { id: senderId },
            content, // Using 'content' to match entity, user prompt said 'text'
        });
        return this.messageRepo.save(message);
    }

    // 3. Get Chat History (CRITICAL for Scrolling!)
    async getMessages(conversationId: string) {
        return this.messageRepo.find({ // No limits!
            where: { conversation: { id: conversationId } },
            relations: ['sender'], // We need to know who sent what
            order: { createdAt: 'ASC' }, // Oldest first (Standard chat layout)
        });
    }

    // 4. Get User's Inbox
    async getInbox(userId: string) {
        const rawConversations = await this.conversationRepo.find({
            where: [
                { finder: { id: userId } },
                { receiver: { id: userId } },
            ],
            relations: ['finder', 'receiver', 'messages'], // Show names and item details
            order: { updatedAt: 'DESC' }
        });

        // Transform for frontend compatibility (mimicking the Controller logic I wrote earlier)
        return rawConversations.map(convo => {
            const amIFinder = convo.finder.id === userId;
            const otherUser = amIFinder ? convo.receiver : convo.finder;
            const lastMessage = convo.messages?.length > 0
                ? convo.messages[convo.messages.length - 1].content
                : "No messages yet";

            return {
                conversationId: `chat_item_${convo.itemId}_finder_${convo.finder.id}_seeker_${convo.receiver.id}`, // Legacy ID
                dbId: convo.id,
                otherUserName: otherUser ? otherUser.fullName : "Unknown",
                otherUserId: otherUser ? otherUser.id : null,
                content: lastMessage,
                updatedAt: convo.updatedAt,
                itemId: convo.itemId
            };
        });
    }

    // 5. Delete a Message (Soft Delete)
    async deleteMessage(userId: string, messageId: string) {
        // Find the message
        const message = await this.messageRepo.findOne({
            where: { id: messageId },
            relations: ['sender'],
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Security Check: Only the sender can delete!
        if (message.sender.id !== userId) {
            throw new Error('You can only delete your own messages');
        }

        // Soft Delete: Hide the text
        message.content = '🚫 This message was deleted';
        message.isDeleted = true;

        return this.messageRepo.save(message);
    }
}
