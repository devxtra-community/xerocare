import { Source } from "../config/dataSource";

export const checkDatabase = async () => {
  try {
    if (!Source.isInitialized) {
      await Source.initialize();
    }

    await Source.query("SELECT 1");

    return {
      status: "UP",
    };
  } catch (error: any) {
    return {
      status: "DOWN",
      error: error.message,
    };
  }
};
