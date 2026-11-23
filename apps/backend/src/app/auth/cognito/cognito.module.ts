import { Global, Module } from '@nestjs/common';
import { CognitoService } from './cognito.service';

// global: the AuthGuard (used by many modules) needs the CognitoService
@Global()
@Module({
  providers: [CognitoService],
  exports: [CognitoService],
})
export class CognitoModule {}
