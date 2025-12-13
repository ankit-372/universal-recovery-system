
import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DebugAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        console.log('🔍 [DebugGuard] Authorization Header:', request.headers.authorization);
        return super.canActivate(context);
    }

    handleRequest(err, user, info) {
        if (info) {
            console.log('❌ [DebugGuard] Passport Info (Error reason):', info);
        }
        if (err) {
            console.error('❌ [DebugGuard] Authentication Error:', err);
        }
        if (!user) {
            console.warn('⚠️ [DebugGuard] No user found. Rethrowing UnauthorizedException.');
            throw err || new UnauthorizedException();
        }
        return user;
    }
}
