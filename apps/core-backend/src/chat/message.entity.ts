import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  content: string;

  // New Flag: If true, the frontend will show "🚫 Message deleted"
  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { nullable: true, onDelete: 'CASCADE' })
  conversation: Conversation;

  @ManyToOne(() => User)
  sender: User;

  @CreateDateColumn()
  createdAt: Date;
}