import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
    getAllNotifications,
    updateNotification,
} from "../controllers/notificationController";
import { updateAccessToken } from "../controllers/userController";

const router = express.Router();

router.get(
    "/",
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    getAllNotifications
);
router.put(
    "/update-notification/:id",
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    updateNotification
);

export default router;
