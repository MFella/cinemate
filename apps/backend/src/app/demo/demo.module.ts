import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SessionService } from '../auth/session.service';
import { DemoService } from './demo.service';
import { DemoTokenService } from './demo-token.service';

// global: the AuthGuard (used by many modules) resolves sessions through SessionService
@Global()
@Module({
  providers: [PrismaService, DemoService, DemoTokenService, SessionService],
  exports: [SessionService, DemoService, DemoTokenService],
})
export class DemoModule {}
