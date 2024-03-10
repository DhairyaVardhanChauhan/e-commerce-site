const User = require("../models/user");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email }).then((user) => {
    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }
    bcrypt.compare(password, user.password).then((isValid) => {
      if (isValid) {
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save((err) => {
          console.log(err);
          res.redirect("/");
        });
      }
      return res.redirect("/login");
    });
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      isAuthenticated: false,
      errorMessage: errors.array()[0].msg,
    });
  }
  User.findOne({ email: email }).then((userDoc) => {
    if (userDoc) {
      req.flash("error", "Email already exists.");
      return res.redirect("/signup");
    }
    return bcrypt.hash(password, 12).then((hashedPassword) => {
      User.findOne({ email: email })
        .then((userDoc) => {
          if (userDoc) {
            return res.redirect("/signup");
          }
          return bcrypt.hash(password, 12);
        })
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then(() => {
          var transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "dhairyacn2020@gmail.com",
              pass: "ywnt sigl bdls yrnw",
            },
          });

          var mailOptions = {
            from: "dhairyacn2020@gmail.com",
            to: email,
            subject: "Sending Email using Node.js",
            text: "That was easy!",
            html: "<h1>You have successfully signed up.<h1/>",
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log("Email sent: " + info.response);
            }
          });

          return res.redirect("/login");
        });
    });
  });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No user found!");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        res.redirect("/");
        var transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "dhairyacn2020@gmail.com",
            pass: "ywnt sigl bdls yrnw",
          },
        });

        var mailOptions = {
          from: "dhairyacn2020@gmail.com",
          to: req.body.email,
          subject: "Sending Email using Node.js",
          text: "That was easy!",
          html: `
              <p>You requested a password reset </p>
              <p>Click this <a href="http://localhost:3000/reset/${token}">Link</a><p>
            `,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      res.render("auth/newPassword", {
        path: "/new-password",
        pageTitle: "Reset Password",
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  let resetUser;
  User.findOne({
    _id: userId,
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then(() => {
      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "dhairyacn2020@gmail.com",
          pass: "ywnt sigl bdls yrnw",
        },
      });

      var mailOptions = {
        from: "dhairyacn2020@gmail.com",
        to: resetUser.email,
        subject: "Sending Email using Node.js",
        text: "Password Changed",
        html: "<h1>Your password has been reset<h1/>",
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};
