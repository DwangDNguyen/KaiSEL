import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/userModel";
import ErrorHandler from "../utils/errorHandler";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import sendEmail from "../utils/sendMail";
import {
    accessTokenOptions,
    refreshTokenOptions,
    sendToken,
} from "../utils/jwt";
import { redis } from "../utils/redis";
import {
    getAllUser,
    getUserById,
    updateUserRoleService,
} from "../services/userService";
import cloudinary from "cloudinary";

dotenv.config();
interface IRegisterUser {
    username: string;
    email: string;
    password: string;
    avatar?: string;
}

interface IActivationToken {
    token: string;
    activationCode: string;
}

interface IActivationRequest {
    activation_code: string;
    activation_token: string;
}

interface ILoginRequest {
    email: string;
    password: string;
}

interface ISocialAuth {
    email: string;
    username: string;
    avatar: string;
}

interface IUpdateUser {
    username?: string;
    email?: string;
}

interface IUpdatePassword {
    oldPassword: string;
    newPassword: string;
}

interface IResetPassword {
    email: string;
    password: string;
    confirmPassword: string;
}

export const registerUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { username, email, password } = req.body;
            const isEmailExist = await userModel.findOne({ email });
            if (isEmailExist) {
                return next(new ErrorHandler("Email already exist", 400));
            }

            const user: IRegisterUser = {
                username,
                email,
                password,
            };
            const activationToken = createActivationToken(user);
            const activationCode = activationToken.activationCode;
            const data = {
                user: { username: user.username },
                activationCode,
            };

            const html = await ejs.renderFile(
                path.join(__dirname, "../mails/activation-mail.ejs"),
                data
            );
            // console.log(path.join(__dirname, "../mails/activation-mail.ejs"));
            try {
                await sendEmail({
                    email: user.email,
                    subject: "Activate your account",
                    template: "activation-mail.ejs",
                    data,
                });
                res.status(201).json({
                    success: true,
                    message: "Activation link sent to your email",
                    token: activationToken.token,
                });
            } catch (err: any) {
                console.log(err.message);

                return next(new ErrorHandler(err.message, 500));
            }
        } catch (err: any) {
            console.log(err.message);
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const token = jwt.sign(
        {
            user,
            activationCode,
        },
        process.env.ACTIVATION_TOKEN_SECRET!,
        {
            expiresIn: "5m",
        }
    );

    return { token, activationCode };
};

export const createUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { activation_code, activation_token } =
                req.body as IActivationRequest;
            let newUser: { user: IUser; activationCode: string };
            try {
                newUser = jwt.verify(
                    activation_token,
                    process.env.ACTIVATION_TOKEN_SECRET!
                ) as { user: IUser; activationCode: string };
            } catch (err) {
                if (err instanceof TokenExpiredError) {
                    return next(
                        new ErrorHandler("Activation code expired", 400)
                    );
                }
                return next(new ErrorHandler("Invalid activation token", 400));
            }
            if (activation_code !== newUser.activationCode) {
                return next(new ErrorHandler("Invalid activation code", 400));
            }

            const { username, email, password } = newUser.user;
            const existUser = await userModel.findOne({ email });
            if (existUser) {
                return next(new ErrorHandler("User already exist", 400));
            }

            const user = await userModel.create({ username, email, password });
            res.status(201).json({
                success: true,
                message: "Create account successfully!",
                user,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const login = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body as ILoginRequest;
            if (!email || !password) {
                return next(
                    new ErrorHandler(
                        "Please provide an email and password",
                        400
                    )
                );
            }
            const user = await userModel.findOne({ email }).select("+password");

            if (!user) {
                return next(new ErrorHandler("Invalid email or password", 400));
            }
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return next(new ErrorHandler("Invalid email or password", 400));
            }
            sendToken(user, 200, res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const logout = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.cookie("access_token", "", { maxAge: 1 });
            res.cookie("refresh_token", "", { maxAge: 1 });
            redis.del(req.user?._id as any);
            res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updateAccessToken = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refresh_token = req.cookies.refresh_token as string;
            const decoded = jwt.verify(
                refresh_token,
                process.env.REFRESH_TOKEN || ""
            ) as JwtPayload;
            const session = await redis.get(decoded.id as string);
            if (!decoded || !session) {
                return next(
                    new ErrorHandler(
                        "Please login to access this resources",
                        400
                    )
                );
            }
            const user = JSON.parse(session);

            const accessToken = jwt.sign(
                { id: user._id },
                process.env.ACCESS_TOKEN as string,
                {
                    expiresIn: "1d",
                }
            );

            const refreshToken = jwt.sign(
                { id: user._id },
                process.env.REFRESH_TOKEN as string,
                {
                    expiresIn: "3d",
                }
            );

            req.user = user;

            res.cookie("access_token", accessToken, accessTokenOptions);
            res.cookie("refresh_token", refreshToken, refreshTokenOptions);

            await redis.set(
                user._id,
                JSON.stringify(user),
                "EX",
                60 * 60 * 24 * 7
            ); //7 days

            res.status(200).json({
                success: true,
                status: "success",
                message: "Access token updated successfully",
                accessToken,
            });
            // next();
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getUserInfo = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?._id;
            getUserById(userId, res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const socialAuth = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, username, avatar } = req.body as ISocialAuth;
            const user = await userModel.findOne({ email });
            if (!user) {
                const newUser = await userModel.create({
                    username,
                    email,
                    avatar,
                });
                sendToken(newUser, 201, res);
            } else {
                sendToken(user, 200, res);
            }
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updateUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?._id;
            const { username, email } = req.body as IUpdateUser;
            const user = await userModel.findById(userId);
            // if (email && user) {
            //     const isEmailExist = await userModel.findOne({ email });
            //     if (isEmailExist) {
            //         return next(new ErrorHandler("Email already exists", 400));
            //     }
            //     user.email = email;
            // }
            if (username && user) {
                const isUsernameExist = await userModel.findOne({ username });
                if (isUsernameExist) {
                    return next(
                        new ErrorHandler("Username already exists", 400)
                    );
                }
                user.username = username;
            }

            await user?.save();
            await redis.set(userId as any, JSON.stringify(user) as any);

            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                user,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updatePassword = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { oldPassword, newPassword } = req.body as IUpdatePassword;
            if (!oldPassword || !newPassword) {
                return next(
                    new ErrorHandler(
                        "Old password and new password are required",
                        400
                    )
                );
            }
            const user = await userModel
                .findById(req.user?._id)
                .select("+password");

            if (user?.password === undefined) {
                return next(new ErrorHandler("Invalid User", 400));
            }
            const isPasswordMatch = await user?.comparePassword(oldPassword);
            if (!isPasswordMatch) {
                return next(new ErrorHandler("Old password is incorrect", 400));
            }

            user.password = newPassword;
            await user.save();
            await redis.set(req.user?._id as any, JSON.stringify(user) as any);
            return res.status(200).json({
                success: true,
                message: "Password updated successfully",
                user,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const resetPasswordLink = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body as IResetPassword;
            if (!email) {
                return next(new ErrorHandler("Email is required", 400));
            }

            const user = await userModel.findOne({ email });
            const activationToken = createActivationToken(user);
            const resetPasswordCode = activationToken.activationCode;
            const data = {
                user: { username: user?.username },
                resetPasswordCode,
            };
            await redis.set(
                "resetPasswordCode" + user?._id,
                JSON.stringify(data) as any
            );
            const html = await ejs.renderFile(
                path.join(__dirname, "../mails/reset-password-mail.ejs"),
                data
            );
            try {
                await sendEmail({
                    email: user?.email || "",
                    subject: "Reset Password",
                    template: "reset-password-mail.ejs",
                    data,
                });
                res.status(201).json({
                    success: true,
                    message: "Reset password link sent to your email",
                    token: activationToken.token,
                });
            } catch (err: any) {
                console.log(err.message);

                return next(new ErrorHandler(err.message, 500));
            }
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const verifyCode = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.body;

            if (!code) {
                return next(new ErrorHandler("Code is required", 400));
            }
            const resetPasswordCode = await redis.get(
                "resetPasswordCode" + req.user?._id
            );
            if (code === resetPasswordCode) {
                await redis.del("resetPasswordCode" + req.user?._id);
                return res.status(200).json({
                    success: true,
                    message: "Code verified successfully",
                });
            }

            return next(new ErrorHandler("Code is invalid", 400));
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const resetPassword = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { password } = req.body;
            if (!password) {
                return next(new ErrorHandler("Password is required", 400));
            }
            const user = await userModel
                .findById(req.user?._id)
                .select("+password");
            if (user?.password === undefined) {
                return next(new ErrorHandler("Invalid User", 400));
            }
            user.password = password;
            await user.save();
            await redis.del("resetPasswordCode" + req.user?._id);
            return res.status(200).json({
                success: true,
                message: "Password reset successfully",
                user,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updateProfileAvt = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { data } = req.body;
            const avatar = data.data;
            const userId = req.user?._id;
            const user = await userModel.findById(userId);
            if (avatar && user) {
                if (user?.avatar?.public_id) {
                    await cloudinary.v2.uploader.destroy(
                        user?.avatar?.public_id
                    );
                    const myCloud = await cloudinary.v2.uploader.upload(
                        avatar,
                        {
                            folder: "KaiSEL avatars",
                        }
                    );
                    user.avatar = {
                        public_id: myCloud.public_id,
                        url: myCloud.secure_url,
                    };
                } else {
                    console.log(123);
                    const myCloud = await cloudinary.v2.uploader.upload(
                        avatar,
                        {
                            folder: "KaiSEL avatars",
                        }
                    );

                    user.avatar = {
                        public_id: myCloud.public_id,
                        url: myCloud.secure_url,
                    };
                }
            }

            await user?.save();
            await redis.set(userId, JSON.stringify(user) as any);

            return res.status(200).json({
                success: true,
                message: "Avatar updated successfully",
                user,
            });
        } catch (err: any) {
            console.log(err);
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllUsers = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllUser(res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const updateUserRole = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, role } = req.body;
            updateUserRoleService(id, role, res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const deleteUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const user = await userModel.findById(id);
            console.log(user);
            if (!user) {
                return next(new ErrorHandler("User not found", 404));
            }

            await userModel.findByIdAndDelete(id);
            console.log("delete successfully");
            await redis.del(id);
            console.log("delete redis successfully");
            res.status(200).json({
                success: true,
                message: "User deleted successfully",
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);
