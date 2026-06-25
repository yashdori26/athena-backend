const { z } = require('zod');

// Schema Definitions
const schemas = {
  auth: {
    register: z.object({
      name: z.string().min(2, "Name must be at least 2 characters").max(50),
      email: z.string().email("Invalid email format"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    }),
    login: z.object({
      email: z.string().email("Invalid email format"),
      password: z.string().min(1, "Password is required"),
    })
  },
  flashcards: {
    generate: z.object({
      subject: z.string().optional().default('Other'),
      topic: z.string().min(1, "Topic is required"),
      count: z.number().int().min(1).max(50).optional().default(10),
    })
  },
  quiz: {
    generate: z.object({
      subject: z.string().optional().default('Other'),
      topic: z.string().min(1, "Topic is required"),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
      numberOfQuestions: z.number().int().min(1).max(20).optional().default(5),
    })
  },
  chat: {
    send: z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1)
      })).min(1),
    })
  }
};

// Generic Validation Middleware
const validate = (schema) => (req, res, next) => {
  try {
    // Parse and mutate req.body with safe defaults
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formattedErrors
      });
    }
    next(error);
  }
};

module.exports = { validate, schemas };
