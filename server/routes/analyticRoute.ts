import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
    getCoursesAnalytics,
    getOrdersAnalytics,
    getUsersAnalytics,
} from "../controllers/analyticsController";

const router = express.Router();

router.get(
    "/users",
    isAuthenticated,
    authorizeRoles("admin"),
    getUsersAnalytics
);

router.get(
    "/courses",
    isAuthenticated,
    authorizeRoles("admin"),
    getCoursesAnalytics
);

router.get(
    "/orders",
    isAuthenticated,
    authorizeRoles("admin"),
    getOrdersAnalytics
);

export default router;
