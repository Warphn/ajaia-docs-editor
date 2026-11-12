/**
 * Starting points for the documents tech teams write every week.
 * Kept in code (not the database): versioned, reviewed in pull requests, no admin UI needed.
 * HTML must only use tags the editor supports; a unit test checks it survives sanitization unchanged.
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  /** Who the document is written for; shown as a hint in the template gallery. */
  audience: string;
  defaultTitle: string;
  contentHtml: string;
}

const hint = (text: string) => `<p><em>${text}</em></p>`;

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  {
    id: 'feature-spec',
    name: 'Feature spec',
    description: 'Plan a new feature: problem, goals, solution, rollout and success metrics.',
    audience: 'Product and engineering',
    defaultTitle: 'Feature spec: <feature name>',
    contentHtml: [
      '<h1>Feature spec: &lt;feature name&gt;</h1>',
      '<p><strong>Owner:</strong> &lt;name&gt; · <strong>Status:</strong> Draft · <strong>Target release:</strong> &lt;date&gt;</p>',
      '<h2>Summary</h2>',
      hint('One paragraph: what are we building, for whom, and why now?'),
      '<h2>Problem</h2>',
      hint('What hurts today? Include evidence: support tickets, data, customer quotes.'),
      '<h2>Goals</h2>',
      '<ul><li><p>&lt;measurable goal&gt;</p></li><li><p>&lt;measurable goal&gt;</p></li></ul>',
      '<h3>Non-goals</h3>',
      '<ul><li><p>&lt;what this feature will deliberately not do&gt;</p></li></ul>',
      '<h2>User stories</h2>',
      '<ul><li><p>As a &lt;role&gt;, I want &lt;capability&gt; so that &lt;outcome&gt;.</p></li></ul>',
      '<h2>Proposed solution</h2>',
      hint('Describe the user flow first, then the main technical pieces. Link designs.'),
      '<h2>Rollout plan</h2>',
      '<ol><li><p>Internal dogfooding behind a feature flag</p></li><li><p>Beta with &lt;n&gt; customers</p></li><li><p>General availability</p></li></ol>',
      '<h2>Success metrics</h2>',
      '<ul><li><p>&lt;metric&gt;: from &lt;baseline&gt; to &lt;target&gt; within &lt;timeframe&gt;</p></li></ul>',
      '<h2>Open questions</h2>',
      '<ul><li><p>&lt;question&gt; (owner: &lt;name&gt;)</p></li></ul>',
    ].join(''),
  },
  {
    id: 'technical-design',
    name: 'Technical design (RFC)',
    description: 'Propose a technical change and the alternatives you considered, before writing code.',
    audience: 'Engineering',
    defaultTitle: 'RFC: <title>',
    contentHtml: [
      '<h1>RFC: &lt;title&gt;</h1>',
      '<p><strong>Author:</strong> &lt;name&gt; · <strong>Reviewers:</strong> &lt;names&gt; · <strong>Status:</strong> In review</p>',
      '<h2>Context</h2>',
      hint('What exists today and what constraint or requirement forces a change?'),
      '<h2>Proposal</h2>',
      hint('The design in enough detail for a reviewer to spot problems: components, data flow, interfaces.'),
      '<h3>Data model and API changes</h3>',
      '<ul><li><p>&lt;table / endpoint&gt;: &lt;change&gt;</p></li></ul>',
      '<h2>Alternatives considered</h2>',
      '<ol><li><p><strong>&lt;alternative&gt;</strong>: why it was not chosen</p></li></ol>',
      '<h2>Tradeoffs and risks</h2>',
      '<ul><li><p>&lt;risk&gt;: mitigation</p></li></ul>',
      '<h2>Migration and rollout</h2>',
      hint('How do we ship this safely? Backfills, feature flags, rollback plan.'),
      '<h2>Security and privacy</h2>',
      hint('New data stored, access rules, threat considerations.'),
      '<h2>Open questions</h2>',
      '<ul><li><p>&lt;question&gt;</p></li></ul>',
    ].join(''),
  },
  {
    id: 'client-feature-presentation',
    name: 'Client feature presentation',
    description: 'Announce a feature to a customer: the problem it solves, how it works and what they gain.',
    audience: 'Customers',
    defaultTitle: 'Introducing <feature name>',
    contentHtml: [
      '<h1>Introducing &lt;feature name&gt;</h1>',
      hint('Write for the customer, not for the team: outcomes over implementation details.'),
      '<h2>What’s new</h2>',
      '<p>&lt;One or two sentences a busy reader can repeat to their manager.&gt;</p>',
      '<h2>The problem we solved</h2>',
      '<p>&lt;Describe the pain in the customer’s own words.&gt;</p>',
      '<h2>How it works</h2>',
      '<ol><li><p>&lt;step&gt;</p></li><li><p>&lt;step&gt;</p></li><li><p>&lt;step&gt;</p></li></ol>',
      '<h2>What your team gains</h2>',
      '<ul><li><p><strong>&lt;benefit&gt;</strong>: &lt;concrete example or number&gt;</p></li><li><p><strong>&lt;benefit&gt;</strong>: &lt;concrete example or number&gt;</p></li></ul>',
      '<h2>Availability</h2>',
      '<p>Available from &lt;date&gt; on &lt;plans&gt;. &lt;How to enable it.&gt;</p>',
      '<h2>Questions</h2>',
      '<p>Contact &lt;name&gt; at &lt;email&gt;.</p>',
    ].join(''),
  },
  {
    id: 'status-update',
    name: 'Status update for management',
    description: 'Report progress, risks and the decisions you need, readable in two minutes.',
    audience: 'Leadership',
    defaultTitle: 'Status update: <project> (<period>)',
    contentHtml: [
      '<h1>Status update: &lt;project&gt; (&lt;period&gt;)</h1>',
      '<p><strong>Overall status:</strong> On track / At risk / Off track</p>',
      '<h2>TL;DR</h2>',
      hint('Three sentences: where we are, the biggest risk, what you need from leadership.'),
      '<h2>Shipped this period</h2>',
      '<ul><li><p>&lt;outcome, not activity&gt;</p></li></ul>',
      '<h2>Key metrics</h2>',
      '<ul><li><p>&lt;metric&gt;: &lt;value&gt; (&lt;trend vs last period&gt;)</p></li></ul>',
      '<h2>Risks and blockers</h2>',
      '<ul><li><p><strong>&lt;risk&gt;</strong>: impact, mitigation, owner</p></li></ul>',
      '<h2>Decisions needed</h2>',
      '<ol><li><p>&lt;decision&gt;, by &lt;date&gt;, options: &lt;A / B&gt;</p></li></ol>',
      '<h2>Next period</h2>',
      '<ul><li><p>&lt;planned outcome&gt;</p></li></ul>',
    ].join(''),
  },
  {
    id: 'incident-postmortem',
    name: 'Incident postmortem',
    description: 'Blameless write-up of an incident: impact, timeline, root cause and follow-ups.',
    audience: 'Engineering and stakeholders',
    defaultTitle: 'Postmortem: <incident> (<date>)',
    contentHtml: [
      '<h1>Postmortem: &lt;incident&gt; (&lt;date&gt;)</h1>',
      '<p><strong>Severity:</strong> &lt;SEV level&gt; · <strong>Duration:</strong> &lt;start – end&gt; · <strong>Author:</strong> &lt;name&gt;</p>',
      '<blockquote><p>Blameless: focus on systems and processes, not individuals.</p></blockquote>',
      '<h2>Summary</h2>',
      hint('What happened, in two or three sentences.'),
      '<h2>Impact</h2>',
      '<ul><li><p>Users affected: &lt;number / segment&gt;</p></li><li><p>Revenue or SLA impact: &lt;details&gt;</p></li></ul>',
      '<h2>Timeline</h2>',
      '<ul><li><p><strong>&lt;hh:mm&gt;</strong> &lt;event&gt;</p></li><li><p><strong>&lt;hh:mm&gt;</strong> Alert fired</p></li><li><p><strong>&lt;hh:mm&gt;</strong> Mitigated</p></li></ul>',
      '<h2>Root cause</h2>',
      hint('Ask “why” until you reach a cause you can fix.'),
      '<h2>What went well</h2>',
      '<ul><li><p>&lt;item&gt;</p></li></ul>',
      '<h2>What went wrong</h2>',
      '<ul><li><p>&lt;item&gt;</p></li></ul>',
      '<h2>Action items</h2>',
      '<ol><li><p>&lt;action&gt; (owner: &lt;name&gt;, due: &lt;date&gt;)</p></li></ol>',
    ].join(''),
  },
];

export function findTemplate(templateId: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((template) => template.id === templateId);
}
