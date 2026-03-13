import { Request, Response, NextFunction } from "express";
import { FeedbackService } from "../services/feedback.service";

const feedbackService = new FeedbackService();

export class FeedbackController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const feedback = await feedbackService.createFeedback(req.body);

      res.status(201).json({
        success: true,
        message: "Feedback submitted successfully. AI analysis in progress.",
        data: feedback.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const feedback = await feedbackService.getFeedbackById(
        req.params.id
      );

      res.json({
        success: true,
        data: feedback.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  static async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await feedbackService.searchFeedback(
        req.query as any
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const feedback = await feedbackService.updateStatus(
        req.params.id,
        req.body.status
      );

      res.json({
        success: true,
        data: feedback.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await feedbackService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}