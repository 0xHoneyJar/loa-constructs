export interface EmbeddingEntry {
  id: string;
  type: 'image' | 'text';
  source: string;
  description: string;
  vector: number[];
}

export interface EmbeddingFile {
  metadata: {
    model: string;
    dimension: number;
    sdk_version: string;
    created: string;
  };
  entries: EmbeddingEntry[];
}
