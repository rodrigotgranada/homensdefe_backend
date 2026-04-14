import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private bucket: any;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const bucketName = this.configService.get<string>('FIREBASE_BUCKET_NAME');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase enviroment variables missing, SDK not initialized.');
      return;
    }

    // Handles the \n parsing inside Render strings securely
    const parsedPrivateKey = privateKey.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: parsedPrivateKey,
      }),
      storageBucket: bucketName,
    });

    this.bucket = admin.storage().bucket();
    console.log(`🔥 Firebase Admin connected on bucket: ${bucketName}`);
  }

  getBucket() {
    return this.bucket;
  }
}
