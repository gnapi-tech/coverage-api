import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectConnection } from 'nest-knexjs';
import { Knex } from 'knex';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import { Project } from '../projects/entities/project.entity';

interface LcovRecord {
  file: string;
  linesTotal: number;
  linesCovered: number;
}

interface JUnitTestCase {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration_sec?: number;
  failure_message?: string;
}

interface IngestFilesOptions {
  projectId: string;
  repo: string;
  branch: string;
  commit: string;
  junitBuffer: Buffer;
  lcovBuffer?: Buffer;
  trigger?: string;
  prNumber?: number;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(@InjectConnection() private readonly knex: Knex) {}

  /**
   * Validate the raw ingestion token against the stored SHA-256 hash for a given project.
   */
  async validateToken(projectId: string, rawToken: string): Promise<void> {
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
  }

  /**
   * Parse a JUnit XML buffer into a flat list of test cases.
   */
  private async parseJunit(buffer: Buffer): Promise<JUnitTestCase[]> {
    const xmlStr = buffer.toString('utf-8');
    let parsed: any;
    try {
      parsed = await xml2js.parseStringPromise(xmlStr, {
        explicitArray: true,
      });
    } catch {
      throw new BadRequestException('Invalid JUnit XML format');
    }

    const testCases: JUnitTestCase[] = [];

    // JUnit format: <testsuites><testsuite name="..."><testcase ...>
    const suites = parsed?.testsuites?.testsuite ?? parsed?.testsuite ?? [];

    for (const suite of suites) {
      const suiteName: string = suite?.$.name ?? 'Unknown Suite';
      const cases = suite?.testcase ?? [];

      for (const tc of cases) {
        const name: string = tc?.$.name ?? 'Unknown Test';
        const timeStr: string = tc?.$.time ?? '0';
        const duration = parseFloat(timeStr);

        let status: 'passed' | 'failed' | 'skipped' = 'passed';
        let failure_message: string | undefined;

        if (tc?.failure) {
          status = 'failed';
          failure_message = tc.failure[0]?._ ?? tc.failure[0] ?? 'Test failed';
        } else if (tc?.skipped) {
          status = 'skipped';
        }

        testCases.push({
          name,
          suite: suiteName,
          status,
          duration_sec: isNaN(duration) ? 0 : duration,
          failure_message,
        });
      }
    }

    return testCases;
  }

  /**
   * Parse an LCOV info buffer into per-file coverage records.
   */
  private parseLcov(buffer: Buffer): LcovRecord[] {
    const content = buffer.toString('utf-8');
    const records: LcovRecord[] = [];
    let current: Partial<LcovRecord> = {};

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SF:')) {
        current.file = trimmed.slice(3);
        current.linesTotal = 0;
        current.linesCovered = 0;
      } else if (trimmed.startsWith('LF:')) {
        current.linesTotal = parseInt(trimmed.slice(3), 10) || 0;
      } else if (trimmed.startsWith('LH:')) {
        current.linesCovered = parseInt(trimmed.slice(3), 10) || 0;
      } else if (trimmed === 'end_of_record') {
        if (current.file) {
          records.push({
            file: current.file,
            linesTotal: current.linesTotal ?? 0,
            linesCovered: current.linesCovered ?? 0,
          });
        }
        current = {};
      }
    }

    return records;
  }

  /**
   * Main ingest function: parse + store junit + lcov into the DB.
   */
  async ingestRun(options: IngestFilesOptions): Promise<{
    runId: string;
    testCasesInserted: number;
    coverageFilesInserted: number;
  }> {
    const {
      projectId,
      repo,
      branch,
      commit,
      junitBuffer,
      lcovBuffer,
      trigger,
      prNumber,
    } = options;

    // Parse JUnit XML
    const testCases = await this.parseJunit(junitBuffer);

    // Build run statistics from test cases
    const total = testCases.length;
    const passed = testCases.filter((tc) => tc.status === 'passed').length;
    const failed = testCases.filter((tc) => tc.status === 'failed').length;
    const skipped = testCases.filter((tc) => tc.status === 'skipped').length;

    // Parse LCOV for coverage %
    let coverageFiles: LcovRecord[] = [];
    let coveragePercent = 0;
    if (lcovBuffer) {
      coverageFiles = this.parseLcov(lcovBuffer);
      const totalLines = coverageFiles.reduce(
        (sum, f) => sum + f.linesTotal,
        0,
      );
      const coveredLines = coverageFiles.reduce(
        (sum, f) => sum + f.linesCovered,
        0,
      );
      coveragePercent =
        totalLines > 0
          ? parseFloat(((coveredLines / totalLines) * 100).toFixed(2))
          : 0;
    }

    return this.knex.transaction(async (trx) => {
      // 1. Insert test run
      const [testRun] = await trx('code_coverage.unit_test_run')
        .insert({
          project_id: projectId,
          repo: repo,
          branch,
          commit_sha: commit,
          trigger: trigger ?? 'push',
          pr_number: prNumber ?? null,
          total,
          passed,
          failed,
          skipped,
          coverage_percent: coveragePercent,
          status: 'completed',
        })
        .returning('*');

      // 2. Insert test cases
      if (testCases.length > 0) {
        await trx('code_coverage.unit_test_cases_run').insert(
          testCases.map((tc) => ({
            run_id: testRun.id,
            suite: tc.suite,
            name: tc.name,
            status: tc.status,
            duration_sec: tc.duration_sec ?? 0,
            failure_message: tc.failure_message ?? null,
          })),
        );
      }

      // 3. Insert coverage files
      if (coverageFiles.length > 0) {
        await trx('code_coverage.coverage_files').insert(
          coverageFiles.map((cf) => ({
            run_id: testRun.id,
            file_path: cf.file,
            lines_total: cf.linesTotal,
            lines_covered: cf.linesCovered,
          })),
        );
      }

      this.logger.log(
        `Ingested run ${testRun.id} for project ${projectId}: ${passed}/${total} passed, coverage ${coveragePercent}%`,
      );

      return {
        runId: testRun.id as string,
        testCasesInserted: testCases.length,
        coverageFilesInserted: coverageFiles.length,
      };
    });
  }
}
