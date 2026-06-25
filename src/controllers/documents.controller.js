const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { CohereEmbeddings } = require('@langchain/cohere');
const pdfParse = require('pdf-parse');
const mongoose = require('mongoose');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    // 1. Parse the PDF into raw text
    let rawText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      rawText = pdfData.text;
    } catch (parseError) {
      console.error('PDF Parse Error:', parseError);
      return res.status(400).json({ success: false, message: 'Failed to read PDF. Ensure it is not corrupted or password-protected.' });
    }

    if (!rawText || rawText.trim() === '') {
      return res.status(400).json({ success: false, message: 'No text found in PDF. Scanned or image-only PDFs are not supported. Please upload a PDF with selectable text.' });
    }

    // 2. Chunk the document into manageable sizes
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const chunks = await splitter.createDocuments([rawText], [{ 
      filename: req.file.originalname, 
      userId: req.userId 
    }]);

    console.log(`✅ Chunked document into ${chunks.length} pieces. Generating embeddings...`);

    // 3. Initialize Cohere Embeddings
    const embeddings = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY, 
      model: "embed-english-v3.0", 
    });

    // 4. Save to MongoDB Atlas Vector Search
    const collection = mongoose.connection.collection("documents");

    try {
      await MongoDBAtlasVectorSearch.fromDocuments(chunks, embeddings, {
        collection: collection,
        indexName: "autoembed_index",
        textKey: "text",
        embeddingKey: "embedding",
      });
    } catch (embedError) {
      console.error('Embedding/Vector DB Error:', embedError);
      return res.status(503).json({ success: false, message: 'Failed to connect to the Vector Database or Embedding provider. Please try again later.' });
    }

    console.log(`✅ Successfully embedded and saved ${chunks.length} chunks to Atlas.`);

    res.json({
      success: true,
      message: `Document processed successfully. Created and vectorized ${chunks.length} chunks.`,
      chunkCount: chunks.length
    });
  } catch (error) {
    console.error('Document Upload & Vectorization Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process document and generate embeddings' });
  }
};
