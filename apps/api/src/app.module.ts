import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { FirebaseModule } from '@taskly/firebase';
import { DatabaseModule } from '@taskly/database';
import { UserModule } from './user/user.module.js';
import { WorkspaceModule } from './workspace/workspace.module.js';

@Module({
  imports: [
    FirebaseModule.forRoot(),
    DatabaseModule,
    UserModule,
    WorkspaceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}


