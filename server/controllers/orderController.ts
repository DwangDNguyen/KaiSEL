import { Request, Response, NextFunction } from "express";
import orderModel, { IOrder } from "../models/orderModel";
import notificationModel from "../models/notificationModel";
import ErrorHandler from "../utils/errorHandler";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import path from "path";
import ejs from "ejs";
import sendEmail from "../utils/sendMail";
import userModel from "../models/userModel";
import courseModel from "../models/courseModel";
import { getAllOrder, newOrder } from "../services/orderService";
import { redis } from "../utils/redis";
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

export const createOrder = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { courseId, payment_info } = req.body as IOrder;

            if (payment_info && "id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId
                );
                if (paymentIntent.status !== "succeeded") {
                    return next(new ErrorHandler("Payment failed", 400));
                }
            }

            const user = await userModel.findById(req.user._id);
            // console.log(user);
            const courseExist = user?.courses.some(
                (course: any) => course._id.toString() === courseId
            );

            if (courseExist) {
                return next(
                    new ErrorHandler(
                        "You have already purchased this course",
                        400
                    )
                );
            }
            const course = await courseModel.findById(courseId);
            console.log(course?.purchased && course?.purchased >= 0);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const data: any = {
                courseId: courseId,
                userId: req.user._id,
            };

            newOrder(data, res, next);

            const mailData = {
                order: {
                    _id: Math.random().toString(36).substr(2, 9),
                    name: course.name,
                    price: course.price,
                    date: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }),
                },
            };

            // console.log(
            //     new Date().toLocaleDateString("en-US", {
            //         year: "numeric",
            //         month: "long",
            //         day: "numeric",
            //     })
            // );

            await ejs.renderFile(
                path.join(__dirname, "../mails/order-confirmation.ejs"),
                { order: mailData }
            );

            try {
                if (user) {
                    await sendEmail({
                        email: req.user.email,
                        subject: "Order Confirmation",
                        template: "order-confirmation.ejs",
                        data: mailData,
                    });
                }
            } catch (err: any) {
                return next(new ErrorHandler(err.message, 500));
            }

            user?.courses.push(course._id as any);
            // console.log(user);
            await redis.set(req.user?._id, JSON.stringify(user));

            await user?.save();
            await courseModel.findByIdAndUpdate(courseId, {
                $inc: { purchased: 1 },
            });

            await notificationModel.create({
                name: user?._id,
                title: "New Order",
                content: `You have a new order from "${course?.name}"`,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllOrders = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllOrder(res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const sendStripePublishableKey = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({
            success: true,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        });
    }
);

export const newPayment = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const myPayment = await stripe.paymentIntents.create({
                amount: req.body.amount,
                currency: "usd",
                metadata: {
                    company: "KaiSEL",
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            res.status(200).json({
                success: true,
                client_secret: myPayment.client_secret,
            });
        } catch (e: any) {
            return next(new ErrorHandler(e.message, 500));
        }
    }
);
