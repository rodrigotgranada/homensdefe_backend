import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    // Assuming the JWT strategy will inject the 'user' object into the request
    const user = request.user;

    if (user && user.id) {
      if (request.method === 'POST') {
        if (request.body) {
          request.body.createdBy = user.id;
          request.body.updatedBy = user.id;
        }
      } else if (request.method === 'PUT' || request.method === 'PATCH') {
        if (request.body) {
          request.body.updatedBy = user.id;
        }
      }
    }

    return next.handle();
  }
}
