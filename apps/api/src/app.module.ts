import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { FirebaseModule } from '@taskly/firebase';
import { DatabaseModule } from '@taskly/database';
import { UserModule } from './user/user.module.js';
import { WorkspaceModule } from './workspace/workspace.module.js';
import { BoardModule } from './board/board.module.js';

@Module({
  imports: [
    FirebaseModule.forRoot(),
    DatabaseModule,
    UserModule,
    WorkspaceModule,
    BoardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}


