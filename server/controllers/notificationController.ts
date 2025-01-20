import { Request, Response, NextFunction } from "express";
import notificationModel from "../models/notificationModel";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";

export const getAllNotifications = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notifications = await notificationModel.find().sort({
                createdAt: -1,
            });

            res.status(200).json({
                success: true,
                notifications,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updateNotification = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notification = await notificationModel.findById(
                req.params.id
            );
            if (!notification) {
                return next(new ErrorHandler("Notification not found", 404));
            } else {
                notification.status
                    ? (notification.status = "read")
                    : notification?.status;
            }

            await notification.save();

            const notifications = await notificationModel.find().sort({
                createdAt: -1,
            });

            res.status(200).json({
                success: true,
                notifications,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);
