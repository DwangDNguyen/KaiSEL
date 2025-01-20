import { Response } from "express";
import courseModel from "../models/courseModel";
import CatchAsyncError from "../middleware/catchAsyncErrors";

export const createCourse = CatchAsyncError(
    async (data: any, res: Response) => {
        const course = await courseModel.create(data);

        res.status(200).json({
            success: true,
            course,
            message: "Course created successfully",
        });
    }
);

export const getAllCourse = async (res: Response) => {
    const courses = await courseModel.find().sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        courses,
    });
};
