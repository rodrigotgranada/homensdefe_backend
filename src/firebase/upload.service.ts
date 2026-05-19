import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async uploadUserProfilePhoto(userId: string, file: any): Promise<string> {
    const bucket = this.firebaseService.getBucket();
    
    // Limpa a pasta de profile do usuário antes de subir a nova foto para não acumular lixo
    try {
      await bucket.deleteFiles({ prefix: `users/${userId}/profile/` });
      this.logger.log(`Fotos antigas apagadas para o usuário: ${userId}`);
    } catch (e) {
      this.logger.warn(`Erro ao limpar fotos antigas (pode estar vazio): ${e.message}`);
    }

    // Caminho solicitado: users/(id_do_usuario)/profile/(foto)
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = `users/${userId}/profile/${fileName}`;
    
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    console.log(`Iniciando upload para: ${filePath}`);

    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('Erro no blobStream:', error);
        this.logger.error(`Erro no upload: ${error.message}`);
        reject(error);
      });

      blobStream.on('finish', async () => {
        try {
          console.log('Upload concluído, tornando arquivo público...');
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          console.log('URL Gerada:', publicUrl);
          resolve(publicUrl);
        } catch (err) {
          console.error('Erro ao tornar público:', err);
          // Fallback: se não conseguir tornar público, retorna a URL mas loga o erro
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          resolve(publicUrl);
        }
      });

      blobStream.end(file.buffer);
    });
  }
}
