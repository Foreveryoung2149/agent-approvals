export function usageTracker(req, res, next) {
  const start = Date.now();

  res.on("finish", async () => {
    const durationMs = Date.now() - start;
    const entry = {
      userId: req.apiKey?.userId === "dev" ? null : req.apiKey?.userId,
      apiKeyId: req.apiKey?.id,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
      ipAddress: req.ip,
    };

    try {
      if (req.prisma?.usageLog && req.apiKey?.id !== "dev") {
        await req.prisma.usageLog.create({ data: entry });
      }
    } catch (error) {
      console.warn("[Nodsend] Failed to write usage log:", error.message);
    }
  });

  next();
}
