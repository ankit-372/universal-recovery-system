import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt'; // <--- Import bcrypt

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 🔒 HASHING MAGIC HAPPENS HERE
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const newUser = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash: hashedPassword, // Store the hash, NOT the real password
      fullName: createUserDto.fullName,
    });

    return this.usersRepository.save(newUser);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findAll() {
    return this.usersRepository.find();
  }

  async findOne(id: string) {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateUserDto: any) {
    await this.usersRepository.update(id, updateUserDto);
    return this.usersRepository.findOne({ where: { id } });
  }

  async remove(id: string) {
    return this.usersRepository.delete(id);
  }

  async setResetToken(userId: string, token: string, expires: Date) {
    return this.usersRepository.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires
    });
  }

  async findByResetToken(token: string) {
    return this.usersRepository.findOne({ where: { resetPasswordToken: token } });
  }

  async updatePasswordAndClearToken(userId: string, passwordHash: string) {
    return this.usersRepository.update(userId, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
  }
}