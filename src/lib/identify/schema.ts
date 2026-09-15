/** Shared Gemini response schema for multi-title identification. */
export const IDENTIFY_TITLES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    titles: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          media_type: {
            type: 'STRING',
            enum: ['movie', 'show', 'book'],
          },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'media_type', 'confidence'],
      },
    },
  },
  required: ['titles'],
} as const
