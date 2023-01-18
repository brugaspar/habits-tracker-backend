import { NextFunction, Request, Response } from "express";

export function cors(request: Request, response: Response, next: NextFunction) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  next();
}
