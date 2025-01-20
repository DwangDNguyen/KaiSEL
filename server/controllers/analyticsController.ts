import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import { genLast12MonthsData } from "../utils/analytics";
import userModel from "../models/userModel";
import courseModel from "../models/courseModel";
import orderModel from "../models/orderModel";

export const getUsersAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const users = await genLast12MonthsData(userModel);
            res.status(200).json({
                success: true,
                users,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getCoursesAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courses = await genLast12MonthsData(courseModel);
            res.status(200).json({
                success: true,
                courses,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getOrdersAnalytics = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orders = await genLast12MonthsData(orderModel);
            res.status(200).json({
                success: true,
                orders,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);
