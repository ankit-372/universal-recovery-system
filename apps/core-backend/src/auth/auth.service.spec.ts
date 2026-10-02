import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
            setResetToken: jest.fn(),
            findByResetToken: jest.fn(),
            updatePasswordAndClearToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-jwt-token'),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendResetEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn().mockResolvedValue('test-session-id'),
            validateSession: jest.fn().mockResolvedValue(true),
            revokeSession: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
