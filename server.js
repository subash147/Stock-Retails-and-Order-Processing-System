const express = require("express");
const mysql = require("mysql2");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "smartretail"
});

db.connect(err => {
  if (err) {
    console.log("Database connection failed");
  } else {
    console.log("MySQL Connected");
  }
});


// LOGIN
app.post("/login", (req, res) => {

  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, result) => {

      if (err) return res.json({ success: false });

      if (result.length > 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }

    });

});


// GET PRODUCTS
app.get("/products", (req, res) => {

  db.query("SELECT * FROM products", (err, result) => {

    if (err) {
      return res.json([]);
    }

    res.json(result);

  });

});


// ADD PRODUCT
app.post("/addproduct", (req, res) => {

  const { name, price, stock } = req.body;

  db.query(
    "INSERT INTO products(name,price,stock) VALUES(?,?,?)",
    [name, price, stock],
    (err) => {

      if (err) {
        res.json({ message: "Add failed" });
      } else {
        res.json({ message: "Product Added" });
      }

    });

});


// DELETE PRODUCT
app.delete("/deleteproduct/:id", (req, res) => {

  db.query(
    "DELETE FROM products WHERE id=?",
    [req.params.id],
    (err) => {

      if (err) {
        res.json({ message: "Delete failed" });
      } else {
        res.json({ message: "Deleted" });
      }

    });

});


// UPDATE PRODUCT
app.put("/updateproduct/:id", (req, res) => {

  const id = req.params.id;
  const { name, price, stock } = req.body;

  db.query(
    "UPDATE products SET name=?, price=?, stock=? WHERE id=?",
    [name, price, stock, id],
    (err) => {

      if (err) {
        res.json({ message: "Update failed" });
      } else {
        res.json({ message: "Product Updated" });
      }

    });

});


// PLACE ORDER (FROM CART)
app.post("/order", (req, res) => {

  const cart = req.body.cart;

  if (!cart || cart.length === 0) {
    return res.json({ message: "Cart empty" });
  }

  cart.forEach(item => {

    // REDUCE STOCK
    db.query(
      "UPDATE products SET stock = stock - ? WHERE id=? AND stock >= ?",
      [item.qty, item.id, item.qty],
      (err, result) => {

        if (err) {
          console.log("Stock update error", err);
          return;
        }

        if (result.affectedRows === 0) {
          console.log("Not enough stock for product ID:", item.id);
          return;
        }

        // SAVE ORDER
        db.query(
          "INSERT INTO orders(product_id,quantity) VALUES(?,?)",
          [item.id, item.qty],
          (err) => {

            if (err) {
              console.log("Order save error", err);
            }

          });

      });

  });

  res.json({ message: "Order placed successfully" });

});


// GET ORDERS (ADMIN PAGE)
app.get("/orders", (req, res) => {

  const sql = `
    SELECT 
      orders.id,
      products.name AS product,
      orders.quantity,
      DATE_FORMAT(orders.order_date,'%Y-%m-%d %H:%i:%s') AS order_date
    FROM orders
    JOIN products ON orders.product_id = products.id
    ORDER BY orders.id DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);

  });

});


// TOTAL PRODUCTS (Dashboard)
app.get("/total-products", (req, res) => {

  db.query(
    "SELECT COUNT(*) AS total FROM products",
    (err, result) => {

      if (err) {
        return res.json({ total: 0 });
      }

      res.json({ total: result[0].total });

    });

});


// TOTAL ORDERS (Dashboard)
app.get("/total-orders", (req, res) => {

  db.query(
    "SELECT COUNT(*) AS total FROM orders",
    (err, result) => {

      if (err) {
        return res.json({ total: 0 });
      }

      res.json({ total: result[0].total });

    });

});


// SALES GRAPH DATA
app.get("/sales-data", (req, res) => {

  const sql = `
    SELECT 
      products.name,
      SUM(orders.quantity) AS total
    FROM orders
    JOIN products ON orders.product_id = products.id
    GROUP BY products.name
  `;

  db.query(sql, (err, result) => {

    if (err) {
      console.log(err);
      return res.json([]);
    }

    res.json(result);

  });

});


app.listen(3000, () => {
  console.log("Server started on port 3000");
});