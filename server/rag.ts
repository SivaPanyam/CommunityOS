import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { isGcpEnabled, uploadToBucket, downloadFromBucket, logStructured, sendCustomMetric, publishPubSubMessage } from "./gcp";

// ==========================================
// RAG Types & Models
// ==========================================

export interface RagDocument {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  uploadTime: string;
  chunkCount: number;
  active: boolean;
  category: string;
}

export interface RagChunk {
  id: string;
  docId: string;
  filename: string;
  text: string;
  vector: number[];
  index: number;
  category: string;
  wordCount: number;
}

export interface RagSettings {
  chunkSize: number;
  chunkOverlap: number;
  alpha: number; // Weight for hybrid search (1.0 = purely semantic, 0.0 = purely keyword)
  searchLimit: number;
}

// Default settings
let settings: RagSettings = {
  chunkSize: 600,
  chunkOverlap: 100,
  alpha: 0.7,
  searchLimit: 5,
};

// Database state
let documents: RagDocument[] = [];
let chunks: RagChunk[] = [];

// Persistence paths
const DATA_DIR = path.join(process.cwd(), "src", "data");
const UPLOADS_DIR = path.join(DATA_DIR, "rag_uploads");
const DB_FILE = path.join(DATA_DIR, "rag_vector_db.json");

// Ensure directories exist
function initDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Load Vector Database state from disk (or Cloud Storage)
export async function loadRagDb() {
  initDirectories();
  try {
    if (isGcpEnabled()) {
      logStructured("INFO", "Attempting to load RAG Vector DB from Cloud Storage");
      const cloudData = await downloadFromBucket("smart-city-rag-bucket", "rag_vector_db.json");
      if (cloudData) {
        const data = JSON.parse(cloudData);
        documents = data.documents || [];
        chunks = data.chunks || [];
        if (data.settings) {
          settings = { ...settings, ...data.settings };
        }
        logStructured("INFO", `Successfully loaded RAG DB from Cloud Storage. ${documents.length} docs, ${chunks.length} chunks.`);
        console.log(`[RAG Database] Loaded ${documents.length} documents and ${chunks.length} chunks from GCS.`);
        return;
      } else {
        logStructured("WARNING", "RAG Vector DB not found in Cloud Storage. Initializing first-time setup.");
      }
    }

    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      documents = data.documents || [];
      chunks = data.chunks || [];
      if (data.settings) {
        settings = { ...settings, ...data.settings };
      }
      console.log(`[RAG Database] Loaded ${documents.length} documents and ${chunks.length} chunks from local disk.`);
    } else {
      // Index initial files if they exist in src/data/rag
      console.log("[RAG Database] No DB file found. Creating clean slate.");
      await saveRagDb();
    }
  } catch (err: any) {
    console.error("[RAG Database] Error loading database:", err);
    logStructured("ERROR", "Error loading RAG Database", { error: err.message });
  }
}

// Save Vector Database state to disk (and sync to Cloud Storage)
export async function saveRagDb() {
  initDirectories();
  try {
    const data = {
      documents,
      chunks,
      settings,
    };
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, content, "utf-8");
    
    if (isGcpEnabled()) {
      logStructured("INFO", "Syncing RAG Database to Cloud Storage bucket: smart-city-rag-bucket");
      const success = await uploadToBucket("smart-city-rag-bucket", "rag_vector_db.json", content);
      if (success) {
        logStructured("INFO", "Synced RAG Database to Cloud Storage successfully.");
      } else {
        logStructured("ERROR", "Failed to sync RAG Database to Cloud Storage.");
      }
    }
  } catch (err: any) {
    console.error("[RAG Database] Error saving database:", err);
    logStructured("ERROR", "Error saving RAG Database", { error: err.message });
  }
}

// ==========================================
// Text Splitter & Extractor Helpers
// ==========================================

/**
 * Split text into chunks using recursive splitters
 */
export function splitText(text: string, chunkSize: number, overlap: number): string[] {
  if (!text) return [];
  
  const result: string[] = [];
  const separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""];
  
  function split(content: string, currentSepIndex: number): string[] {
    if (content.length <= chunkSize) {
      return [content];
    }
    
    if (currentSepIndex >= separators.length) {
      // Hard split as last resort
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += chunkSize - overlap) {
        chunks.push(content.slice(i, i + chunkSize));
      }
      return chunks;
    }
    
    const separator = separators[currentSepIndex];
    const parts = content.split(separator);
    const subChunks: string[] = [];
    let currentChunk = "";
    
    for (const part of parts) {
      const potentialChunk = currentChunk ? currentChunk + separator + part : part;
      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          subChunks.push(currentChunk);
        }
        // If a single part is larger than chunkSize, split it deeper
        if (part.length > chunkSize) {
          const deeperSplits = split(part, currentSepIndex + 1);
          subChunks.push(...deeperSplits);
          currentChunk = "";
        } else {
          currentChunk = part;
        }
      }
    }
    
    if (currentChunk) {
      subChunks.push(currentChunk);
    }
    
    return subChunks;
  }

  // Generate chunks
  const initialChunks = split(text, 0);
  
  // Apply overlap buffer reconstruction for continuity
  if (overlap <= 0 || initialChunks.length <= 1) {
    return initialChunks;
  }

  const finalChunks: string[] = [];
  for (let i = 0; i < initialChunks.length; i++) {
    const current = initialChunks[i];
    if (i === 0) {
      finalChunks.push(current);
    } else {
      const prev = initialChunks[i - 1];
      const overlapText = prev.slice(-overlap);
      finalChunks.push(overlapText + current);
    }
  }
  
  return finalChunks;
}

/**
 * Clean extract from raw PDF buffer without external packages
 */
function extractPdfText(buffer: Buffer): string {
  const content = buffer.toString("binary");
  const regex = /BT([\s\S]*?)ET/g;
  let matches;
  let text = "";
  
  while ((matches = regex.exec(content)) !== null) {
    const block = matches[1];
    // Find strings in parentheses: (string)
    const stringRegex = /\((.*?)\)/g;
    let strMatches;
    while ((strMatches = stringRegex.exec(block)) !== null) {
      let segment = strMatches[1];
      // Decode octal escapes e.g. \345
      segment = segment.replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
      // Decode escaped characters
      segment = segment.replace(/\\(.)/g, "$1");
      text += segment + " ";
    }
    text += "\n";
  }
  
  // Fallback if no text stream found: search clean ASCII chars
  if (text.trim().length < 50) {
    text = content
      .replace(/[\x00-\x1F\x7F-\xFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  return text;
}

// ==========================================
// Embedding & Vector Operations
// ==========================================

/**
 * Generate embedding vector using Gemini API
 */
export async function generateEmbedding(ai: GoogleGenAI | null, text: string): Promise<number[]> {
  if (!ai) {
    // Generate dummy/simulated deterministic vector if Gemini is not set up
    const vector: number[] = [];
    for (let i = 0; i < 768; i++) {
      let hash = 0;
      for (let j = 0; j < text.length; j++) {
        hash = text.charCodeAt(j) + ((hash << 5) - hash);
      }
      vector.push(Math.sin(hash + i) * 0.1);
    }
    return vector;
  }

  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: [text],
    });

    if (result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
      return result.embeddings[0].values;
    }
    throw new Error("Invalid response format from Gemini Embedding API");
  } catch (err) {
    console.error("[RAG Embedding] Error calling embedding API, falling back:", err);
    // Fallback deterministic vector
    const vector: number[] = [];
    for (let i = 0; i < 768; i++) {
      vector.push(Math.sin(text.length + i) * 0.1);
    }
    return vector;
  }
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==========================================
// Retrieval Algorithms (Semantic, Keyword, Hybrid)
// ==========================================

/**
 * Pure Keyword similarity (calculates a token overlap + term-frequency-like score)
 */
function calculateKeywordScore(chunkText: string, query: string): number {
  const queryTokens = query.toLowerCase().split(/[^a-z0-9]+/i).filter(t => t.length > 2);
  if (queryTokens.length === 0) return 0;

  const chunkLower = chunkText.toLowerCase();
  let matches = 0;
  
  queryTokens.forEach(token => {
    // Exact word or subsegment occurrences
    const occurrences = chunkLower.split(token).length - 1;
    if (occurrences > 0) {
      matches += 1 + Math.log1p(occurrences); // term frequency logarithmic scaling
    }
  });

  return matches / queryTokens.length;
}

// ==========================================
// RAG Core Business Methods
// ==========================================

export function getDocuments(): RagDocument[] {
  return documents;
}

export function getChunks(): RagChunk[] {
  return chunks;
}

export async function toggleDocument(id: string): Promise<boolean> {
  const doc = documents.find(d => d.id === id);
  if (doc) {
    doc.active = !doc.active;
    await saveRagDb();
    return true;
  }
  return false;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const initialDocCount = documents.length;
  documents = documents.filter(d => d.id !== id);
  chunks = chunks.filter(c => c.docId !== id);
  
  if (documents.length < initialDocCount) {
    await saveRagDb();
    return true;
  }
  return false;
}

export async function updateSettings(newSettings: Partial<RagSettings>) {
  settings = { ...settings, ...newSettings };
  await saveRagDb();
}

export function getSettings(): RagSettings {
  return settings;
}

/**
 * Upload and process a new document (reads, chunks, embeds, indexes)
 */
export async function uploadDocument(
  ai: GoogleGenAI | null,
  filename: string,
  buffer: Buffer,
  category: string = "General"
): Promise<RagDocument> {
  initDirectories();
  
  // Extract text
  let rawText = "";
  const mimeType = filename.endsWith(".pdf") ? "application/pdf" : "text/plain";
  
  if (filename.endsWith(".pdf")) {
    rawText = extractPdfText(buffer);
  } else {
    rawText = buffer.toString("utf-8");
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error("No readable text could be extracted from this document.");
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Save source file to uploads directory for local backup
  const savedFilePath = path.join(UPLOADS_DIR, `${docId}_${filename}`);
  fs.writeFileSync(savedFilePath, buffer);

  // GCS integration in production
  if (isGcpEnabled()) {
    logStructured("INFO", `Uploading document ${filename} to Cloud Storage bucket: smart-city-rag-uploads`, { docId, filename });
    await uploadToBucket("smart-city-rag-uploads", `${docId}_${filename}`, buffer);
  }

  // Generate chunks
  const textChunks = splitText(rawText, settings.chunkSize, settings.chunkOverlap);
  console.log(`[RAG Upload] Extracted text from "${filename}". Generating ${textChunks.length} chunks.`);

  // Create RAG document
  const ragDoc: RagDocument = {
    id: docId,
    filename,
    fileSize: buffer.length,
    mimeType,
    uploadTime: new Date().toISOString(),
    chunkCount: textChunks.length,
    active: true,
    category,
  };

  documents.push(ragDoc);

  // Embed and add chunks to database
  const chunkPromises = textChunks.map(async (text, index) => {
    const vector = await generateEmbedding(ai, text);
    const ragChunk: RagChunk = {
      id: `${docId}_chunk_${index}`,
      docId,
      filename,
      text,
      vector,
      index,
      category,
      wordCount: text.split(/\s+/).length,
    };
    return ragChunk;
  });

  const processedChunks = await Promise.all(chunkPromises);
  chunks.push(...processedChunks);

  // Persist vector database state
  await saveRagDb();

  // GCP logging, metrics and Pub/Sub in production
  if (isGcpEnabled()) {
    logStructured("INFO", `Successfully indexed document: ${filename}`, {
      docId,
      filename,
      chunkCount: textChunks.length,
      category,
    });
    
    // Publish telemetry monitoring metric
    await sendCustomMetric("rag_document_uploads", 1);
    await sendCustomMetric("rag_chunk_count", textChunks.length);

    // Publish Pub/Sub event
    await publishPubSubMessage("municipal-events-topic", {
      event: "document_indexed",
      timestamp: new Date().toISOString(),
      docId,
      filename,
      category,
      chunkCount: textChunks.length,
    });
  }

  return ragDoc;
}

/**
 * Main retrieval engine combining semantic (vector) and keyword (BM25-like) retrieval
 */
export async function retrieveRelevantChunks(
  ai: GoogleGenAI | null,
  query: string,
  customLimit?: number
): Promise<{ chunk: RagChunk; score: number; semanticScore: number; keywordScore: number }[]> {
  if (chunks.length === 0) return [];

  // 1. Filter out chunks belonging to inactive documents
  const activeDocIds = new Set(documents.filter(d => d.active).map(d => d.id));
  const activeChunks = chunks.filter(c => activeDocIds.has(c.docId));
  
  if (activeChunks.length === 0) return [];

  // 2. Compute query embedding vector for semantic search
  const queryVector = await generateEmbedding(ai, query);

  // 3. Score all active chunks
  const scoredChunks = activeChunks.map(chunk => {
    // Semantic Score (Cosine similarity)
    const semanticScore = cosineSimilarity(queryVector, chunk.vector);
    
    // Keyword Score (Term overlap)
    const keywordScore = calculateKeywordScore(chunk.text, query);
    
    // Combine scores based on alpha
    const combinedScore = settings.alpha * semanticScore + (1 - settings.alpha) * keywordScore;
    
    return {
      chunk,
      score: combinedScore,
      semanticScore,
      keywordScore,
    };
  });

  // 4. Sort and filter
  scoredChunks.sort((a, b) => b.score - a.score);
  
  const limit = customLimit || settings.searchLimit;
  return scoredChunks.slice(0, limit);
}

/**
 * Complete citation-supported chat workflow
 */
export async function runRagChat(
  ai: GoogleGenAI | null,
  message: string,
  history: { role: string; text: string }[] = []
): Promise<{
  answer: string;
  retrievedChunks: { filename: string; text: string; index: number; score: number }[];
  citations: { index: number; filename: string; text: string }[];
}> {
  // 1. Retrieve the most relevant chunks
  const retrievedResults = await retrieveRelevantChunks(ai, message);
  
  if (retrievedResults.length === 0) {
    return {
      answer: "No active documents found in the database. Please upload policy documents or standard operating procedures (SOPs) to search.",
      retrievedChunks: [],
      citations: [],
    };
  }

  // 2. Compile document context with citation markers
  let contextBlock = "--- START OF UPLOADED DOCUMENTS CONTEXT ---\n";
  retrievedResults.forEach((res, idx) => {
    contextBlock += `\n[Document ${idx + 1}: "${res.chunk.filename}" (chunk ${res.chunk.index})]\n`;
    contextBlock += `${res.chunk.text}\n`;
  });
  contextBlock += "--- END OF UPLOADED DOCUMENTS CONTEXT ---";

  // 3. Assemble system prompt strictly framing the response to document boundaries
  const systemInstruction = `
    You are CommunityOS's Expert AI Policy Analyst.
    Your task is to analyze municipal guidelines, disaster responses, standard operating procedures (SOPs), and urban safety documents.
    
    CRITICAL CONSTRAINT: You must answer the user's query using ONLY the provided "UPLOADED DOCUMENTS CONTEXT".
    - Do NOT use your own external general knowledge to answer questions if they contradict or are not mentioned in the context.
    - If the answer cannot be found or reasonably inferred from the provided document context, state exactly: "I apologize, but the uploaded municipal SOP documents do not contain information to resolve this query."
    - Be professional, technical, and objective.
    
    CITATION MANDATE: You MUST cite your statements using bracketed citation markers corresponding to the document index.
    For example: "If rainfall exceeds 10mm/hr, emergency alerts should be dispatched to the reservoir operator [1]. Traffic blocks on exit 2 should trigger signal priorities [2]."
    Never make up a citation that does not exist in the context.
  `;

  // 4. Map chat history into standard Gemini format
  const contents: any[] = [];
  history.forEach(msg => {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  });

  // Append current prompt together with context block
  const userPromptWithContext = `
    Query: "${message}"
    
    ${contextBlock}
    
    Please provide your expert answer based strictly on the document context above, citing all sources correctly.
  `;
  
  contents.push({
    role: "user",
    parts: [{ text: userPromptWithContext }],
  });

  let responseText = "";
  if (!ai) {
    // Generate deterministic simulated response in offline mode
    responseText = `[Simulated RAG Analysis] Based on the active SOP document "${retrievedResults[0].chunk.filename}", the standard emergency threshold triggers when sensor feeds exceed standard parameters. According to Section 1, automatic emergency routing coordinates first responder channels [1]. High-priority dispatch teams should optimize traffic signal intersections [2].`;
  } else {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.1, // Keep it highly deterministic and focused on context
        },
      });
      responseText = response.text || "No response generated.";
    } catch (err) {
      console.error("[RAG Chat] Error querying Gemini:", err);
      responseText = "An error occurred while calling the AI model for RAG reasoning. Please check your credentials.";
    }
  }

  // 5. Build dynamic citations mapping matched bracketed citations to retrieved sources
  const citationMatches = responseText.match(/\[\d+\]/g) || [];
  const uniqueIndexes = Array.from(new Set(citationMatches.map(c => parseInt(c.slice(1, -1)))));

  const matchedCitations = uniqueIndexes
    .map(idx => {
      const result = retrievedResults[idx - 1];
      if (result) {
        return {
          index: idx,
          filename: result.chunk.filename,
          text: result.chunk.text.substring(0, 200) + "...",
        };
      }
      return null;
    })
    .filter((c): c is { index: number; filename: string; text: string } => c !== null);

  return {
    answer: responseText,
    retrievedChunks: retrievedResults.map(r => ({
      filename: r.chunk.filename,
      text: r.chunk.text,
      index: r.chunk.index,
      score: r.score,
    })),
    citations: matchedCitations,
  };
}

// ==========================================
// Seed initial files if any exists
// ==========================================
export async function seedInitialSOPs(ai: GoogleGenAI | null) {
  initDirectories();
  try {
    const defaultSopDir = path.join(process.cwd(), "src", "data", "rag");
    if (fs.existsSync(defaultSopDir) && documents.length === 0) {
      const files = fs.readdirSync(defaultSopDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          const content = fs.readFileSync(path.join(defaultSopDir, file));
          console.log(`[RAG Database] Auto-indexing initial SOP file: ${file}`);
          await uploadDocument(ai, file, content, "Policy Guideline");
        }
      }
    }
  } catch (err) {
    console.warn("[RAG Database] Failed to auto-seed initial SOP files:", err);
  }
}
