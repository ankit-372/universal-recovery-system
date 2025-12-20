import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { DebugAuthGuard } from '../auth/debug-auth.guard';

@Controller('chat')
@UseGuards(DebugAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    // Create a chat (Call this when you click "Contact Finder")
    // Note: The frontend uses the Gateway/Socket usually, but having an API endpoint is good practice too.
    @Post('start')
    async startChat(@Req() req, @Body() body: { targetUserId: string; itemId: string }) {
        // We assume the caller is the 'seeker' (receiver in DB terms relative to the finder)
        // Actually, checking logic:
        // If I click "Contact Finder", I am the seeker (receiver).
        // The target is the finder.
        // So finderId = targetUserId, receiverId = myID.
        const myId = req.user.id || req.user.userId || req.user.sub;

        // We need to know who is who. For now, let's assume body.targetUserId is the Finder.
        // Ideally the frontend sends both or we deduce it. 
        // Given the prompt "startConversation(user1Id, user2Id)", let's map it:
        return this.chatService.startConversation(body.targetUserId, myId, body.itemId);
    }

    // Get My Inbox
    @Get('inbox')
    async getInbox(@Req() req) { // changed from 'conversations' to match user request 'inbox' 
        const myId = req.user.id || req.user.userId || req.user.sub;
        console.log(`fetching inbox for ${myId}`);
        return this.chatService.getInbox(myId);
    }

    // Also keep old endpoint for backward compatibility just in case
    @Get('conversations')
    async getConversations(@Req() req) {
        const myId = req.user.id || req.user.userId || req.user.sub;
        return this.chatService.getInbox(myId);
    }

    // Get History (For Scrolling)
    @Get(':conversationId/messages')
    async getMessages(@Param('conversationId') conversationId: string) {
        return this.chatService.getMessages(conversationId);
    }

    // Delete a Message
    @Delete('message/:id')
    async deleteMessage(@Req() req, @Param('id') messageId: string) {
        try {
            return await this.chatService.deleteMessage(req.user.id, messageId);
        } catch (error) {
            // Return a nice 403 error if they try to delete someone else's message
            throw new HttpException(error.message, HttpStatus.FORBIDDEN);
        }
    }
}