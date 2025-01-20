import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
    addQuestion,
    addReplyQuestion,
    addReplyToReview,
    addReview,
    deleteCourse,
    editCourse,
    getAllCourses,
    getAllCoursesAdmin,
    getAllQuestions,
    getAllReviews,
    getCourse,
    getCourseByAdmin,
    getCourseByUser,
    getFeaturedCourses,
    uploadCourse,
} from "../controllers/courseController";
import { updateAccessToken } from "../controllers/userController";

const router = express.Router();

router.post(
    "/upload-course",
    // updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    uploadCourse
);

router.put(
    "/edit-course/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    editCourse
);

router.get("/get-course/:id", getCourse);
router.get(
    "/get-course-by-admin/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    getCourseByAdmin
);
router.get("/get-all-courses", getAllCourses);
router.get("/get-course-content/:id", isAuthenticated, getCourseByUser);
router.put("/add-question", isAuthenticated, addQuestion);
router.put("/add-answer", isAuthenticated, addReplyQuestion);
router.get("/:id/get-all-questions", isAuthenticated, getAllQuestions);
router.put("/add-review/:id", isAuthenticated, addReview);
router.put(
    "/add-reply",
    isAuthenticated,
    authorizeRoles("admin"),
    addReplyToReview
);

router.get("/get-all-reviews/:id", getAllReviews);

router.get(
    "/get-courses-by-admin",
    isAuthenticated,
    authorizeRoles("admin"),
    getAllCoursesAdmin
);

router.delete(
    "/delete-course/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    deleteCourse
);

router.get("/get-featured-courses", getFeaturedCourses);

export default router;
