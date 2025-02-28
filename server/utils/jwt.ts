import dotenv from "dotenv";
import { Response } from "express";
import { IUser } from "../models/userModel";
import { redis } from "./redis";

dotenv.config();

interface IOptionTokens {
    expiresIn: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none" | undefined;
    secure?: boolean;
}

const accessTokenExpire = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "300",
    10
);
const refreshTokenExpire = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "604800",
    10
);

export const accessTokenOptions: IOptionTokens = {
    expiresIn: new Date(Date.now() + accessTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};

export const refreshTokenOptions: IOptionTokens = {
    expiresIn: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.accessToken();
    const refreshToken = user.refreshToken();
    //upload session to redis
    redis.set(user._id as any, JSON.stringify(user) as any);

    //only set secure to true in production
    if (process.env.NODE_ENV === "production") {
        accessTokenOptions.secure = true;
    }

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);
    res.status(statusCode).json({
        success: true,
        message: "Logged in successfully",
        accessToken,
        user,
        // refreshToken,
    });
};
