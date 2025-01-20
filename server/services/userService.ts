import { Response } from "express";
import userModel from "../models/userModel";
import { redis } from "../utils/redis";

export const getUserById = async (id: string, res: Response) => {
    const userJSON = await redis.get(id);

    if (userJSON) {
        const user = JSON.parse(userJSON);
        res.status(200).json({
            success: true,
            user,
        });
    }
};

export const getAllUser = async (res: Response) => {
    const users = await userModel.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        users,
    });
};

export const updateUserRoleService = async (
    id: string,
    role: string,
    res: Response
) => {
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

    res.status(200).json({
        success: true,
        user,
    });
};
