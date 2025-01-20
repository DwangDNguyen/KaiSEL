import { NextFunction, Request, Response } from "express";
import CatchAsyncError from "./catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { redis } from "../utils/redis";
dotenv.config();

export const isAuthenticated = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        const access_token = req.cookies.access_token;

        if (!access_token) {
            return next(
                new ErrorHandler(
                    "You are not logged in. Please log in to get access.",
                    400
                )
            );
        }

        const decoded = jwt.verify(
            access_token,
            process.env.ACCESS_TOKEN || ""
        ) as JwtPayload;
        if (!decoded) {
            return next(new ErrorHandler("Access token is invalid", 400));
        }

        const user = await redis.get(decoded.id);

        if (!user) {
            return next(
                new ErrorHandler("Please login to access this resource", 400)
            );
        }

        req.user = JSON.parse(user);
        next();
    }
);

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler("Role not allowed", 403));
        }
        next();
    };
};
