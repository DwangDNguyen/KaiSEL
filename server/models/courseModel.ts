import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./userModel";

interface IReview extends Document {
    user: IUser;
    rating?: number;
    review: string;
    reviewReplies?: IComment[];
}

interface IComment extends Document {
    user: IUser;
    question: string;
    questionReplies?: IComment[];
}

interface ILink extends Document {
    title: string;
    url: string;
}

interface ICourseData extends Document {
    title: string;
    description: string;
    videoUrl: string;
    videoThumbnail: object;
    videoSection: string;
    videoLength: number;
    videoPlayer: string;
    links: ILink[];
    suggestion?: string;
    questions: IComment[];
}

interface ICourse extends Document {
    name: string;
    description?: string;
    price: number;
    estimatePrice?: number;
    thumbnail?: object;
    tag: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    review: IReview[];
    courseData: ICourseData[];
    ratings?: number;
    purchased?: number;
}

const replySchema = new Schema(
    {
        user: Object,
        answer: String,
    },
    {
        timestamps: true,
    }
);

const reviewSchema = new Schema<IReview>(
    {
        user: {
            type: Object,
        },
        rating: {
            type: Number,
            default: 0,
        },
        review: String,
        reviewReplies: [replySchema],
    },
    { timestamps: true }
);

const linkSchema = new Schema<ILink>({
    title: String,
    url: String,
});

const commentSchema = new Schema<IComment>(
    {
        user: Object,
        question: String,
        questionReplies: [replySchema],
    },
    { timestamps: true }
);

const courseDataSchema = new Schema<ICourseData>({
    title: String,
    description: String,
    videoUrl: String,
    // videoThumbnail: Object,
    videoSection: String,
    videoLength: Number,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [commentSchema],
});

const courseSchema = new Schema<ICourse>(
    {
        name: {
            type: String,
            required: [true, "Please provide a name"],
        },
        description: {
            type: String,
            required: [true, "Please provide a description"],
        },
        price: {
            type: Number,
            required: [true, "Please provide a price"],
        },
        estimatePrice: {
            type: Number,
            default: 0,
        },
        thumbnail: {
            public_id: {
                type: String,
                required: true,
            },
            url: {
                type: String,
                required: true,
            },
        },
        tag: {
            type: String,
            required: [true, "Please provide a tag"],
        },
        level: {
            type: String,
            required: [true, "Please provide a level"],
        },
        demoUrl: {
            type: String,
            required: [true, "Please provide a demo url"],
        },
        benefits: [{ title: String }],
        prerequisites: [{ title: String }],
        review: [reviewSchema],
        courseData: [courseDataSchema],
        ratings: {
            type: Number,
            default: 0,
        },
        purchased: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<ICourse>("Course", courseSchema);
