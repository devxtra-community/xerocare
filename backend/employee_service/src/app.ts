import "reflect-metadata";
import express from "express";
import { Source } from "./config/dataSource";
import "./config/env";
import { verifyAuthentication } from "./controllers/auth.Controller";
import adminRouter from "./routes/adminRoutes";

const app = express();
app.use(express.json());

const startServer = async () => {
  try {
    await Source.initialize();
    console.log("Database connected");

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("DB connection failed", error);
    process.exit(1);
  }
};
app.use('/auth/verify',verifyAuthentication)
app.use("/admin",adminRouter)

startServer();
