const express = require("express");

const authController = require("../controllers/auth");
const { check } = require("express-validator");
const router = express.Router();
const User = require("../models/user");

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Enter a valid email")
      .normalizeEmail(),
    check(
      "password",
      "please enter a password of length 5 with alphanumeric values."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .custom((val, { req }) => {
        return User.findOne({ email: val }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("Email exists in the database");
          }
        });
      })
      .normalizeEmail(),
    check(
      "password",
      "please enter a password of length 5 with alphanumeric values."
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    check("confirmPassword")
      .trim()
      .custom((val, { req }) => {
        if (val !== req.body.password) {
          throw new Error("Passwords do not match!");
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);

router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);
module.exports = router;
