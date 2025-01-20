import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotification extends Document {
    title: string;
    content: string;
    status: string;
    userId: string;
}

const notificationSchema = new Schema<INotification>(
    {
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            default: "unread",
        },
        userId: {
            type: String,
            // required: true,
        },
    },
    { timestamps: true }
);

const Notification = mongoose.model<INotification>(
    "Notification",
    notificationSchema
);

export default Notification;
