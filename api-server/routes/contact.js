import { Router } from "express";
import { z } from "zod";

import { sendContactEmail } from "../lib/email.js";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  category: z.enum(["product", "enterprise", "support", "partnership", "other"]),
  subject: z.string().trim().min(3, "Add a short subject.").max(160),
  message: z.string().trim().min(20, "Tell us a little more so we can route your message.").max(5000),
  website: z.string().trim().max(300).optional().default(""),
}).strict();

export function createContactRouter({ send = sendContactEmail } = {}) {
  const router = Router();

  router.post("/", async (req, res, next) => {
    try {
      const input = contactSchema.parse(req.body || {});

      // A completed honeypot is accepted without delivery so automated senders
      // cannot use the response to tune their submissions.
      if (input.website) {
        return res.status(202).json({
          ok: true,
          message: "Thanks - your message has been received.",
        });
      }

      const result = await send({
        name: input.name,
        email: input.email,
        category: input.category,
        subject: input.subject,
        message: input.message,
        requestId: req.requestId || null,
      });

      if (!result?.success) {
        return res.status(503).json({
          error: {
            code: "contact_delivery_unavailable",
            message: "We could not deliver your message just now. Please try again shortly or copy our email address.",
          },
        });
      }

      return res.status(202).json({
        ok: true,
        message: "Thanks - your message is on its way to the Nodsend team.",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "invalid_request",
            message: error.issues[0]?.message || "Check the form and try again.",
          },
        });
      }
      return next(error);
    }
  });

  return router;
}

export const contactRouter = createContactRouter();
