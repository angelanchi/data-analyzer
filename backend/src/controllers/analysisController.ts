import { Request, Response } from 'express';
import { analysisJobQueue, AnalysisJobRequest } from '@/services/analysisJobQueue';

export class AnalysisController {
  static async createJob(req: Request, res: Response) {
    try {
      const payload = req.body as AnalysisJobRequest;
      const job = analysisJobQueue.enqueue(payload);

      res.status(202).json({
        jobId: job.jobId,
        status: job.status,
        createdAt: job.createdAt
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown analysis error';
      console.error('Failed to enqueue analysis job:', error);
      res.status(400).json({ message });
    }
  }

  static async getJobStatus(req: Request, res: Response) {
    const { jobId } = req.params;
    const job = analysisJobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ message: `Job ${jobId} not found` });
    }

    return res.status(200).json(job);
  }
}
