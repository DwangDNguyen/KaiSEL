import express from "express";
import {
    createUser,
    deleteUser,
    getAllUsers,
    getUserInfo,
    login,
    logout,
    registerUser,
    resetPassword,
    resetPasswordLink,
    socialAuth,
    updateAccessToken,
    updatePassword,
    updateProfileAvt,
    updateUser,
    updateUserRole,
    verifyCode,
} from "../controllers/userController";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";

const router = express.Router();

router.post("/register", registerUser);
router.post("/create-user", createUser);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.get("/refreshToken", updateAccessToken);
router.get("/me", isAuthenticated, getUserInfo);
router.post("/social-auth", socialAuth);
router.put("/update-user", isAuthenticated, updateUser);
router.put("/update-password", isAuthenticated, updatePassword);
router.post("/reset-password-link", isAuthenticated, resetPasswordLink);
router.post("/verify-code", verifyCode);
router.put("/reset-password", resetPassword);
router.get(
    "/get-users-by-admin",
    isAuthenticated,
    authorizeRoles("admin"),
    getAllUsers
);

router.put(
    "/update-user-role",
    isAuthenticated,
    authorizeRoles("admin"),
    updateUserRole
);

router.put("/update-user-avatar", isAuthenticated, updateProfileAvt);

router.delete(
    "/delete-user/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    deleteUser
);

export default router;
