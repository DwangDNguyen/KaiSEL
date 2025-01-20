import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbUrl: string = process.env.MONGO || "";

const connectDB = async () => {
    try {
        await mongoose
            .connect(dbUrl)
            .then(() => console.log("MongoDB connected"));
    } catch (error: any) {
        console.log(error.message);
        setTimeout(connectDB, 5000);
    }
};

export default connectDB;
