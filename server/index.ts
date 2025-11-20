import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { createServer as createHttpServer } from "http";
import routes from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = express();

app.use(express.json({
  limit: '10mb',
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = createHttpServer(app);

  // API 라우트
  app.use("/api", routes);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development" || process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || '3000', 10);

  // 포트 에러 핸들링
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log(`⚠️  포트 ${PORT}가 이미 사용 중입니다. 다른 포트를 사용하거나 기존 프로세스를 종료하세요.`);
      process.exit(1);
    } else {
      log(`❌ 서버 에러: ${err.message}`);
      throw err;
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();

