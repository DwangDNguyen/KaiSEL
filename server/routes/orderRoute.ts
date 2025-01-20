import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
    createOrder,
    getAllOrders,
    newPayment,
    sendStripePublishableKey,
} from "../controllers/orderController";
import { updateAccessToken } from "../controllers/userController";

const router = express.Router();

router.put("/create-order", isAuthenticated, createOrder);
router.get(
    "/get-orders-by-admin",
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    getAllOrders
);
router.get("/payment/stripePublishableKey", sendStripePublishableKey);
router.post("/payment", isAuthenticated, newPayment);
export default router;
