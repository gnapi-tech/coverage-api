import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IngestService } from './ingest.service';
import * as crypto from 'crypto';
import { InjectConnection } from 'nest-knexjs';
import { Knex } from 'knex';
import type { Project } from '../projects/entities/project.entity';

@Controller('ingest')
export class IngestController {
  constructor(
    private readonly ingestService: IngestService,
    @InjectConnection() private readonly knex: Knex,
  ) {}

  /**
   * POST /ingest/runs
   * Accepts multipart form-data with:
   *   - projectId   (form field)
   *   - branch      (form field)
   *   - commit      (form field)
   *   - junit       (file: junit.xml)
   *   - lcov        (file: lcov.info, optional)
   *
   * Header: Authorization: Bearer <raw-ingestion-token>
   */
  @Post('runs')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'junit', maxCount: 1 },
        { name: 'lcov', maxCount: 1 },
      ],
      { storage: memoryStorage() },
    ),
  )
  async ingestRun(
    @UploadedFiles()
    files: { junit?: Express.Multer.File[]; lcov?: Express.Multer.File[] },
    @Req()
    req: { headers: Record<string, string>; body: Record<string, string> },
  ) {
    // 1. Extract + validate auth token
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const rawToken = authHeader.slice(7);

    // 2. Extract form fields
    const body = req.body;
    const projectId = body['projectId'];
    const branch = body['branch'];
    const commit = body['commit'];
    const repo = body['repo'] ?? 'unknown';

    if (!projectId) throw new BadRequestException('projectId is required');
    if (!branch) throw new BadRequestException('branch is required');
    if (!commit) throw new BadRequestException('commit is required');

    // 3. Validate raw token against stored SHA-256 hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const project = await this.knex<Project>('code_coverage.project_ingestion')
      .where({ projectid: projectId, ingestiontoken: hashedToken })
      .first();

    if (!project) {
      throw new UnauthorizedException(
        'Invalid ingestion token for this project',
      );
    }

    // 4. Validate that junit file was uploaded
    const junitFile = files?.junit?.[0];
    if (!junitFile) {
      throw new BadRequestException(
        'junit file is required (field name: junit)',
      );
    }

    const lcovFile = files?.lcov?.[0];

    // 5. Run the ingest
    const result = await this.ingestService.ingestRun({
      projectId,
      repo,
      branch,
      commit,
      junitBuffer: junitFile.buffer,
      lcovBuffer: lcovFile?.buffer,
      trigger: body['trigger'] ?? 'push',
      prNumber: body['pr_number'] ? parseInt(body['pr_number']) : undefined,
    });

    return {
      success: true,
      message: 'Test run ingested successfully',
      runId: result.runId,
      testCasesInserted: result.testCasesInserted,
      coverageFilesInserted: result.coverageFilesInserted,
    };
  }
}
