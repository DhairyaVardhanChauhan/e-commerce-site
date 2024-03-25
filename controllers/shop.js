const Product = require("../models/product");
const Order = require("../models/order");
const path = require("path");
const PDFDocument = require("pdfkit");
const fs = require("fs");

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  console.log(prodId);
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user.populate("cart.items.productId").then((user) => {
    res.render("./shop/cart", {
      path: "/cart",
      pageTitle: "Cart",
      products: user.cart.items,
    });
  });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId).then((product) => {
    req.user.addToCart(product).then((result) => {
      res.redirect("/cart");
    });
  });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user.deleteFromCart(prodId).then(() => {
    res.redirect("/cart");
  });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const objUser = { email: user.email, userId: user._id };
      const products = user.cart.items.map((items) => {
        return {
          quantity: items.quantity,
          product: { ...items.productId._doc },
        };
      });
      const order = new Order({ products: products, user: objUser });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getCheckout = (req, res, next) => {
  res.render("shop/checkout", {
    path: "/checkout",
    pageTitle: "Checkout",
  });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = "invoice-" + orderId + ".pdf";
  const invoicePath = path.join("data", "invoices", invoiceName);
  Order.findById(orderId).then((order) => {
    if (!order) {
      return next(new Error("No order found."));
    }

    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error("Access Denied!"));
    }
    // fs.readFile(invoicePath, (err, data) => {
    //   if (err) {
    //     return next(err);
    //   }
    //   res.setHeader("Content-Type", "application/pdf");
    //   res.setHeader(
    //     "Content-Disposition",
    //     'inline; filename="' + invoiceName + '"'
    //   );
    //   res.send(data);
    // });
    const pdfDoc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="' + invoiceName + '"'
    );
    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);
    pdfDoc.fontSize(26).text("INVOICE", { underline: true });
    pdfDoc
      .fontSize(11)
      .text(
        "-----------------------------------------------------------------"
      );
    let sum = 0;
    order.products.forEach((item) => {
      sum += item.quantity * item.product.price;
      pdfDoc
        .fontSize(11)
        .text(
          item.product.title +
            " - " +
            item.quantity +
            " X " +
            "$" +
            item.product.price +
            "= " +
            "$" +
            item.quantity * item.product.price
        );
    });
    pdfDoc.text(
      "-----------------------------------------------------------------"
    );
    pdfDoc.fillColor("red").text(`Total: $${sum}`);
    pdfDoc.end();
  });
};
