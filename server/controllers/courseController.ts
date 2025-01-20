import { Request, Response, NextFunction } from "express";
import courseModel from "../models/courseModel";
import notificationModel from "../models/notificationModel";
import ErrorHandler from "../utils/errorHandler";
import CatchAsyncError from "../middleware/catchAsyncErrors";
import { redis } from "../utils/redis";
import cloudinary from "cloudinary";
import { createCourse, getAllCourse } from "../services/courseService";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendEmail from "../utils/sendMail";
import cron from "node-cron";
interface IAddQuestion {
    question: string;
    courseId: string;
    contentId: string;
}

interface IAddAnswer {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

interface IAddReview {
    review: string;
    courseId: string;
    rating: number;
    userId: string;
}

interface IAddReplyReview {
    answer: string;
    courseId: string;
    reviewId: string;
}

export const uploadCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            console.log(req.body);
            // const thumbnail = data.thumbnail;
            // if (thumbnail) {
            //     const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
            //         folder: "KaiSEL courses",
            //     });

            //     data.thumbnail = {
            //         public_id: cloud.public_id,
            //         url: cloud.secure_url,
            //     };
            // }
            createCourse(data, res, next);
        } catch (err: any) {
            console.log(err);
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const editCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req.body;
            console.log(data);
            const thumbnail = data.thumbnail;

            if (thumbnail) {
                console.log(thumbnail.public_id);
                await cloudinary.v2.uploader.destroy(thumbnail.public_id);
                // const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
                //     folder: "KaiSEL courses",
                // });
                // data.thumbnail = {
                //     public_id: cloud.public_id,
                //     url: cloud.secure_url,
                // };
            }

            const courseId = req.params.id;

            const course = await courseModel.findByIdAndUpdate(
                courseId,
                {
                    $set: data,
                },
                { new: true }
            );

            res.status(200).json({
                success: true,
                message: "Course updated successfully",
                course,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courseId = req.params.id;
            const isCacheExist = await redis.get(courseId);
            if (isCacheExist) {
                const course = JSON.parse(isCacheExist);
                return res.status(200).json({
                    success: true,
                    course,
                });
            } else {
                const course = await courseModel
                    .findById(req.params.id)
                    .select(
                        "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
                    );
                await redis.set(
                    courseId,
                    JSON.stringify(course),
                    "EX",
                    60 * 60 * 24 * 7
                ); // 7 days
                res.status(200).json({
                    success: true,
                    course,
                });
            }
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getCourseByAdmin = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const course = await courseModel.findById(req.params.id);
            res.status(200).json({
                success: true,
                course,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllCourses = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // const isCacheExist = await redis.get("allCourses");
            // if (isCacheExist) {
            //     const courses = JSON.parse(isCacheExist);
            //     return res.status(200).json({
            //         success: true,
            //         courses,
            //     });
            // } else {
            const courses = await courseModel
                .find()
                .select(
                    "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
                );
            await redis.set("allCourses", JSON.stringify(courses));

            res.status(200).json({
                success: true,
                courses,
            });
            // }
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getCourseByUser = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;
            console.log(courseId);

            const courseExists = userCourseList?.find(
                (course: any) => course._id.toString() === courseId
            );

            if (!courseExists) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const course = await courseModel.findById(courseId);

            const content = course?.courseData;
            return res.status(200).json({
                success: true,
                content,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const addQuestion = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { question, courseId, contentId }: IAddQuestion = req.body;
            const course = await courseModel.findById(courseId);
            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid content id", 404));
            }

            const courseContent = course?.courseData?.find(
                (item: any) => item._id.toString() === contentId
            );
            console.log(courseContent);

            if (!courseContent) {
                return next(new ErrorHandler("Content not found", 404));
            }

            const newQuestion: any = {
                question,
                user: req.user,
                questionReplies: [],
            };
            courseContent?.questions?.unshift(newQuestion);

            await notificationModel.create({
                userId: req.user._id,
                title: "New Question Received",
                content:
                    "You have a new question in course " + courseContent.title,
            });

            await course?.save();
            res.status(200).json({
                success: true,
                message: "Question added successfully",
                newQuestion,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const addReplyQuestion = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { answer, questionId, courseId, contentId }: IAddAnswer =
                req.body;
            const course = await courseModel.findById(courseId);
            if (!mongoose.Types.ObjectId.isValid(contentId)) {
                return next(new ErrorHandler("Invalid content id", 404));
            }

            const courseContent = course?.courseData?.find(
                (item: any) => item._id.toString() === contentId
            );

            if (!courseContent) {
                return next(new ErrorHandler("Content not found", 404));
            }

            const question = courseContent?.questions?.find((item: any) => {
                return item._id.toString() === questionId;
            });

            if (!question) {
                return next(new ErrorHandler("Question not found", 404));
            }

            const newAnswer: any = {
                user: req.user,
                answer,
            };

            question?.questionReplies?.push(newAnswer);

            await course?.save();

            if (req.user?._id === question.user._id) {
                //create notification
                await notificationModel.create({
                    userId: req.user._id,
                    title: "New Reply Received",
                    message:
                        "You have a new reply in question " + question.question,
                });
            } else {
                const data = {
                    name: question.user.username,
                    title: courseContent.title,
                };
                const html = await ejs.renderFile(
                    path.join(__dirname, "../mails/question-reply-mail.ejs"),
                    data
                );
                try {
                    await sendEmail({
                        email: question.user.email,
                        subject: "Question Reply",
                        template: "question-reply-mail.ejs",
                        data,
                    });
                } catch (err: any) {
                    return next(new ErrorHandler(err.message, 500));
                }
            }

            res.status(200).json({
                success: true,
                message: "Answer added successfully",
                course,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllQuestions = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page?.toString() || "1");
            const limit = parseInt(req.query.limit?.toString() || "5");
            const skip = (page - 1) * limit;
            const course = await courseModel.findById(req.params.id);
            const content = course?.courseData;
            const allQuestions = content?.flatMap((item: any) => {
                return { contentId: item._id, questions: item.questions };
            }); //all question in all videos of course
            const paginatedQuestions = allQuestions?.slice(skip, skip + limit);
            console.log(allQuestions);
            const totalQuestions = allQuestions?.length;
            res.status(200).json({
                success: true,
                questions: allQuestions,
                paginatedQuestions,
                totalQuestions,
                hasMore: totalQuestions ? skip + limit < totalQuestions : false,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getAllReviews = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const page = parseInt(req.query.page?.toString() || "1");
            const limit = parseInt(req.query.limit?.toString() || "5");
            const skip = (page - 1) * limit;

            const course = await courseModel.findById(req.params.id, {
                review: { $slice: [skip, limit] },
            });
            const thisCourse = await courseModel.findById(req.params.id);
            const allReviews = thisCourse?.review;
            console.log(allReviews);
            const totalReviews = course?.review?.length;
            res.status(200).json({
                success: true,
                reviews: course?.review,
                allReviews,
                totalReviews,
                hasMore: totalReviews ? skip + limit < totalReviews : false,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const addReview = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userCourseList = req.user?.courses;
            const courseId = req.params.id;

            //check if course exists
            const courseExists = userCourseList?.some(
                (course: any) => course._id.toString() === courseId.toString()
            );

            if (!courseExists) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const { rating, review } = req.body as IAddReview;
            console.log(req.body);
            if (!review) {
                return res.status(400).json({ message: "Review is required" });
            }
            console.log(review);
            const course = await courseModel.findById(courseId);
            const newReview: any = {
                user: req.user,
                rating: rating,
                review,
                reviewReplies: [],
            };

            course?.review.unshift(newReview);

            let avg = 0;

            course?.review.forEach((review: any) => {
                avg += review.rating;
            });
            if (course) {
                course.ratings = avg / course?.review.length;
            }
            await course?.save();
            await redis.set(
                courseId,
                JSON.stringify({
                    ...course?.toObject(),
                    ratings: course?.ratings,
                }),
                "EX",
                60 * 60 * 24 * 7
            );

            const notification = {
                title: "New review received",
                message: `${req.user.name} has reviewed your course`,
            };

            //create notification

            res.status(200).json({
                success: true,
                message: "Review added successfully",
                course,
                review: newReview,
            });
        } catch (err: any) {
            console.log(err);
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const addReplyToReview = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { answer, courseId, reviewId } = req.body as IAddReplyReview;
            const course = await courseModel.findById(courseId);
            if (!mongoose.Types.ObjectId.isValid(reviewId)) {
                return next(new ErrorHandler("Invalid review id", 404));
            }
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }

            const review = course?.review?.find((item: any) => {
                return item._id.toString() === reviewId;
            });

            if (!review) {
                return next(new ErrorHandler("Review not found", 404));
            }

            const reply: any = {
                user: req.user,
                answer,
            };

            if (!review.reviewReplies) {
                review.reviewReplies = [];
            }

            review.reviewReplies?.push(reply);

            await course.save();
            res.status(200).json({
                success: true,
                message: "Reply added successfully",
                course,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

cron.schedule("0 0 0 * * *", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await notificationModel.deleteMany({
        status: "read",
        createdAt: { $lt: thirtyDaysAgo },
    });
    console.log("deleted read notifications older than 30 days");
});

export const getAllCoursesAdmin = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllCourse(res);
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const deleteCourse = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const course = await courseModel.findById(id);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }
            await courseModel.findByIdAndDelete(id);
            await redis.del(id);
            res.status(200).json({
                success: true,
                message: "Course deleted successfully",
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

export const getFeaturedCourses = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const courses = await courseModel
                .find()
                .sort({ rating: -1 })
                .limit(6);
            res.status(200).json({
                success: true,
                courses,
            });
        } catch (err: any) {
            return next(new ErrorHandler(err.message, 500));
        }
    }
);

// export const uploadVideoCourse = CatchAsyncError(
//     async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const { data } = req.body;
//             const video = data.data;

//             // const userId = req.user?._id;
//             // const user = await courseModel.findById(userId);
//             if (video) {
//                 if (user?.avatar?.public_id) {
//                     await cloudinary.v2.uploader.destroy(
//                         user?.avatar?.public_id
//                     );
//                     const myCloud = await cloudinary.v2.uploader.upload(
//                         video,
//                         {
//                             folder: "KaiSEL avatars",
//                         }
//                     );
//                      = {
//                         public_id: myCloud.public_id,
//                         url: myCloud.secure_url,
//                     };
//                 } else {
//                     console.log(123);
//                     const myCloud = await cloudinary.v2.uploader.upload(
//                         video,
//                         {
//                             folder: "KaiSEL avatars",
//                         }
//                     );

//                     user.avatar = {
//                         public_id: myCloud.public_id,
//                         url: myCloud.secure_url,
//                     };
//                 }
//             }

//             await user?.save();
//             await redis.set(userId, JSON.stringify(user) as any);

//             return res.status(200).json({
//                 success: true,
//                 message: "Avatar updated successfully",
//                 user,
//             });
//         } catch (err: any) {
//             console.log(err.message);
//             return next(new ErrorHandler(err.message, 500));
//         }
//     }
// );
