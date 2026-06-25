const aiService = require('../services/ai.service');

exports.sendMessage = async (req, res) => {
  try {
    const { messages } = req.body; 

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Invalid messages format' });
    }

    const aiResponse = await aiService.getChatCompletion(messages);

    res.json({
      success: true,
      message: {
        role: 'assistant',
        content: aiResponse,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Server-Sent Events (SSE) Streaming Endpoint
exports.streamMessage = async (req, res) => {
  try {
    const { messages } = req.body; 

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Invalid messages format' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // --- RAG LOGIC ---
    // Extract the latest user message to search the Vector DB
    const latestMessage = messages[messages.length - 1]?.content || "";
    
    try {
      const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
      const { CohereEmbeddings } = require('@langchain/cohere');
      const mongoose = require('mongoose');

      const embeddings = new CohereEmbeddings({
        apiKey: process.env.COHERE_API_KEY,
        model: "embed-english-v3.0",
      });

      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
        collection: mongoose.connection.collection("documents"),
        indexName: "autoembed_index",
        textKey: "text",
        embeddingKey: "embedding",
      });

      // Retrieve the top 3 most relevant textbook chunks
      const relevantDocs = await vectorStore.similaritySearch(latestMessage, 3);
      
      if (relevantDocs.length > 0) {
        const contextString = relevantDocs.map(doc => doc.pageContent).join("\n\n");
        // Secretly inject this context into the system prompt so the AI can use it
        messages.unshift({
          role: 'system',
          content: `You are an AI Study Helper. Answer the user's question using ONLY the following textbook context. If the context does not contain the answer, say "I don't have enough information from your uploaded documents to answer that."\n\nTEXTBOOK CONTEXT:\n${contextString}`
        });
      }
    } catch (dbError) {
      console.log('RAG Retrieval skipped (DB might not be configured or empty):', dbError.message);
    }
    // --- END RAG LOGIC ---

    const stream = await aiService.streamChatCompletion(messages);

    for await (const chunk of stream) {
      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
      }
    }

    // Send a completion event
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream Controller Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};
