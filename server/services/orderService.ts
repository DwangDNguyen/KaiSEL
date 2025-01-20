import { NextFunction, Request, Response } from "express";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/errorHandler";
import orderModel from "../models/orderModel";

export const newOrder = CatchAsyncError(
    async (data: any, res: Response, next: NextFunction) => {
        try {
            const order = await orderModel.create(data);
            res.status(200).json({
                success: true,
                message: "Order created successfully",
                order,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllOrder = async (res: Response) => {
    const orders = await orderModel.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        orders,
    });
};
