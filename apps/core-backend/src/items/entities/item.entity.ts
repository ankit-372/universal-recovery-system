import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column()
  imageUrl: string; // URL to MinIO

  @Column("simple-array", { nullable: true })
  tags: string[]; // ["backpack", "red"] from YOLO

  @Column("float", { array: true, nullable: true })
  vector: number[]; // [0.12, -0.5...] from CLIP

  @Column({ default: false })
  isLost: boolean; // true = lost, false = found

  @ManyToOne(() => User, (user) => user.id)
  user: User; // Who posted this?

  @CreateDateColumn()
  createdAt: Date;
}