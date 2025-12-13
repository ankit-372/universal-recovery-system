import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid') // Generates unique IDs like 'a1b2-c3d4...'
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string; // We never store raw passwords!

  @Column({ nullable: true })
  fullName: string;

  @Column({ default: false })
  isVerified: boolean; // For KYC verification later

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}