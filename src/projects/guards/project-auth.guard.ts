import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Knex } from 'knex';
import { InjectConnection } from 'nest-knexjs';
import { Request } from 'express';
import { Project } from '../entities/project.entity';

export interface ProjectRequest extends Request {
  project?: Project;
}

@Injectable()
export class ProjectAuthGuard implements CanActivate {
  constructor(@InjectConnection() private readonly knex: Knex) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    // According to projects: we look up the project by the token.
    const project = await this.knex<Project>('code_coverage.project_ingestion')
      .where({ ingestiontoken: token })
      .first();

    if (!project) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    // Attach project to request for further use in controllers (if needed)
    request.project = project;

    // If there is an ID param in the route (e.g. /projects/:id), it must match the token's project
    const routeId = request.params.id;
    if (routeId && routeId !== project.projectid) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Check Authorization header (Bearer token)
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    // Check custom headers
    const apiKey =
      request.headers['x-api-key'] || request.headers['x-api-token'];
    if (apiKey) {
      return apiKey as string;
    }

    return undefined;
  }
}
