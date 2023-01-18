import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors-util";

export function errors(error: any, request: Request, response: Response, next: NextFunction) {
  if (error instanceof AppError) {
    return response.status(error.status).json({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: error.issues,
    });
  }

  return response.sendStatus(500);
}
