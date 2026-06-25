const { ChatOpenAI } = require('@langchain/openai');
const { StructuredOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');

/**
 * Reusable AI Service using LangChain for guaranteed JSON schema outputs.
 */
class AIService {
  constructor() {
    // We use ChatOpenAI because Grok's API is perfectly compatible with the OpenAI SDK
    this.model = new ChatOpenAI({
      modelName: 'grok-beta',
      openAIApiKey: process.env.XAI_API_KEY || 'API_KEY_HERE',
      configuration: {
        baseURL: 'https://api.x.ai/v1',
      },
      temperature: 0.2, // Low temperature for consistent JSON
    });
  }

  /**
   * Generates a structured output guaranteed to match the given Zod schema.
   * @param {z.ZodType} schema - The Zod schema to enforce.
   * @param {string} promptText - The user's prompt/instructions.
   * @returns {Promise<any>} The parsed JSON object matching the schema.
   */
  async getStructuredCompletion(schema, promptText) {
    try {
      const parser = StructuredOutputParser.fromZodSchema(schema);
      
      const promptTemplate = PromptTemplate.fromTemplate(`
        {promptText}
        
        {format_instructions}
      `);

      const chain = RunnableSequence.from([
        promptTemplate,
        this.model,
        parser,
      ]);

      const response = await chain.invoke({
        promptText: promptText,
        format_instructions: parser.getFormatInstructions(),
      });

      return response;
    } catch (error) {
      console.error('LangChain AI Service Error:', error.message);
      if (error?.status === 429) {
        throw new Error('AI_RATE_LIMIT');
      }
      if (error?.status === 401 || error?.status === 403) {
        throw new Error('AI_AUTH_ERROR');
      }
      // Let the controller handle the throw
      throw new Error(`AI Structural Generation Failed: ${error.message}`);
    }
  }

  /**
   * Generic text completion (for Chat functionality)
   * @param {Array} messages - [{role, content}]
   */
  async getChatCompletion(messages) {
    // Convert generic messages to LangChain format if needed
    // For simplicity, we just use the model directly
    try {
      // Map [{role: 'user', content: '...'}, ...] to langchain message classes
      const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
      const formattedMessages = messages.map(m => {
        if (m.role === 'system') return new SystemMessage(m.content);
        if (m.role === 'assistant') return new AIMessage(m.content);
        return new HumanMessage(m.content);
      });

      const response = await this.model.invoke(formattedMessages);
      return response.content;
    } catch (error) {
      console.error('LangChain Chat Error:', error.message);
      if (error?.status === 429) throw new Error('AI_RATE_LIMIT');
      if (error?.status === 401 || error?.status === 403) throw new Error('AI_AUTH_ERROR');
      throw new Error('AI Service is unreachable.');
    }
  }

  /**
   * Streams a chat completion (Server-Sent Events)
   * @param {Array} messages - [{role, content}]
   * @returns {AsyncIterable} A stream of tokens
   */
  async streamChatCompletion(messages) {
    try {
      const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
      const formattedMessages = messages.map(m => {
        if (m.role === 'system') return new SystemMessage(m.content);
        if (m.role === 'assistant') return new AIMessage(m.content);
        return new HumanMessage(m.content);
      });

      return await this.model.stream(formattedMessages);
    } catch (error) {
      console.error('LangChain Stream Error:', error.message);
      if (error?.status === 429) throw new Error('AI_RATE_LIMIT');
      if (error?.status === 401 || error?.status === 403) throw new Error('AI_AUTH_ERROR');
      throw new Error('AI Stream is unreachable.');
    }
  }
}

module.exports = new AIService();
