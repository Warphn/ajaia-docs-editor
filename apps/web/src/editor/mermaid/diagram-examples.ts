export const DIAGRAM_EXAMPLES = [
  {
    label: 'Flowchart',
    source: [
      'flowchart LR',
      '  request[Client request] --> auth{Signed in?}',
      '  auth -- yes --> api[API]',
      '  auth -- no --> login[Login page]',
      '  api --> db[(Postgres)]',
    ].join('\n'),
  },
  {
    label: 'Sequence',
    source: [
      'sequenceDiagram',
      '  participant Browser',
      '  participant API',
      '  participant DB',
      '  Browser->>API: PATCH /documents/:id (version 3)',
      '  API->>DB: UPDATE ... WHERE version = 3',
      '  DB-->>API: 1 row updated',
      '  API-->>Browser: 200 (version 4)',
    ].join('\n'),
  },
  {
    label: 'Entity relationship',
    source: [
      'erDiagram',
      '  USER ||--o{ DOCUMENT : owns',
      '  DOCUMENT ||--o{ SHARE : "shared via"',
      '  USER ||--o{ SHARE : receives',
    ].join('\n'),
  },
] as const;

export const DEFAULT_DIAGRAM_SOURCE = DIAGRAM_EXAMPLES[0].source;
