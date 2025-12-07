import { pipeline } from '@xenova/transformers'

let embeddingPipeline = null

// Initialize the embedding model (runs once)
export const initEmbeddings = async () => {
  if (!embeddingPipeline) {
    try {
      console.log('Loading embedding model...')
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      console.log('Embedding model loaded successfully')
    } catch (error) {
      console.error('Failed to load embedding model:', error)
      throw new Error(`Embedding model failed to load: ${error.message}`)
    }
  }
  return embeddingPipeline
}

// Generate embedding for text
export const getEmbedding = async (text) => {
  try {
    const pipe = await initEmbeddings()
    const output = await pipe(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw error
  }
}

// Calculate cosine similarity between two vectors
export const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Chunk text into smaller pieces
export const chunkText = (text, chunkSize = 500, overlap = 50) => {
  const chunks = []
  const words = text.split(/\s+/)
  
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    if (chunk.trim()) {
      chunks.push(chunk.trim())
    }
  }
  
  return chunks
}

// Search documents using semantic similarity
export const semanticSearch = async (query, documents, topK = 5) => {
  const queryEmbedding = await getEmbedding(query)
  
  const results = []
  
  for (const doc of documents) {
    if (!doc.chunks || !doc.embeddings) continue
    
    for (let i = 0; i < doc.chunks.length; i++) {
      const similarity = cosineSimilarity(queryEmbedding, doc.embeddings[i])
      results.push({
        docId: doc.id,
        docName: doc.name,
        chunk: doc.chunks[i],
        similarity,
        category: doc.category
      })
    }
  }
  
  // Sort by similarity and return top K
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}
