import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Message } from './message.entity';
import { User } from '../users/entities/user.entity';

@Entity()
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    itemId: string;

    // We explicitly link users to make looking up "My Configured Chats" easy
    @ManyToOne(() => User)
    finder: User;

    @ManyToOne(() => User)
    receiver: User;

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
