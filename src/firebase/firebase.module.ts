import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { UploadService } from './upload.service';

@Global()
@Module({
  providers: [FirebaseService, UploadService],
  exports: [FirebaseService, UploadService],
})
export class FirebaseModule {}
