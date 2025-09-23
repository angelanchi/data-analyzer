import { randomUUID } from 'crypto';
import path from 'path';

// Type definitions (previously from pythonPipelineService, now local)
export interface AnalysisJobRequest {
  inputFiles: string[];
  outputDir: string;
  config?: Record<string, any>;
}

export interface AnalysisRunResult {
  outputDir: string;
  generatedFiles: string[];
  summary?: Record<string, any>;
}

export type AnalysisJobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface AnalysisJobRecord {
  jobId: string;
  request: AnalysisJobRequest;
  status: AnalysisJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: AnalysisRunResult;
  error?: string;
}

class AnalysisJobQueue {
  private queue: AnalysisJobRecord[] = [];
  private jobs = new Map<string, AnalysisJobRecord>();
  private processing = false;

  enqueue(request: AnalysisJobRequest): AnalysisJobRecord {
    const jobId = randomUUID();
    const job: AnalysisJobRecord = {
      jobId,
      request,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);
    this.processNext();

    return job;
  }

  getJob(jobId: string): AnalysisJobRecord | undefined {
    const job = this.jobs.get(jobId);
    if (!job) {
      return undefined;
    }
    if (job.result) {
      return {
        ...job,
        result: {
          ...job.result,
          outputDir: path.resolve(job.result.outputDir)
        }
      };
    }
    return job;
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }

    const job = this.queue.shift();
    if (!job) {
      return;
    }

    this.processing = true;
    job.status = 'running';
    job.startedAt = new Date().toISOString();

    try {
      // NOTE: Python pipeline removed in v2.0
      // This feature is planned for future implementation (v2.1+)
      // For now, return a "not implemented" error
      throw new Error('Advanced analysis pipeline not yet implemented. This feature is planned for v2.1+');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pipeline error';
      job.error = message;
      job.status = 'failed';
    } finally {
      job.finishedAt = new Date().toISOString();
      this.processing = false;
      setImmediate(() => this.processNext());
    }
  }
}

export const analysisJobQueue = new AnalysisJobQueue();
