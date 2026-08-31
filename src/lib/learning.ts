export interface Lesson {
  id: string
  title: string
  duration: string
  summary: string
  transcript: string[]
  glossary: Array<{ term: string; definition: string }>
  question: string
  answers: string[]
  correctAnswer: number
}

export const LESSONS: Lesson[] = [
  {
    id: 'sale-types', title: 'Tax liens vs. tax deeds', duration: '8 min', summary: 'Understand what is actually being sold and how the return is created.',
    transcript: ['A tax-lien sale generally sells a claim tied to delinquent taxes; a tax-deed sale generally sells the real property through a government process.', 'Rules, redemption rights, bidding methods, and post-sale steps vary by jurisdiction. The selling authority and current official documents always control.'],
    glossary: [{ term: 'Tax lien', definition: 'A legal claim associated with unpaid property taxes.' }, { term: 'Tax deed', definition: 'A deed issued through a tax-sale process, subject to the jurisdiction’s rules and risks.' }],
    question: 'What should you confirm first?', answers: ['The color of the property', 'Whether the sale offers a lien or the property', 'The agent commission'], correctAnswer: 1,
  },
  {
    id: 'official-record', title: 'Read the official sale record', duration: '10 min', summary: 'Match the parcel, case, amount, date, and source before deeper research.',
    transcript: ['Use the selling authority’s record as the controlling starting point.', 'Confirm the parcel or case identifier, sale status, opening amount, auction date, registration instructions, and payment rules.'],
    glossary: [{ term: 'Parcel ID', definition: 'The local identifier assigned to a parcel.' }, { term: 'Opening bid', definition: 'The published starting amount, which can change before the sale.' }],
    question: 'Which source should control?', answers: ['A social post', 'A saved screenshot', 'The current official sale record'], correctAnswer: 2,
  },
  {
    id: 'title-and-liens', title: 'Research title, liens, and parties', duration: '14 min', summary: 'Document ownership, encumbrances, notices, and unresolved questions.',
    transcript: ['A tax sale does not automatically make every other interest disappear.', 'Review the title chain and recorded documents, identify parties and liens, and obtain qualified legal or title help when the risk is material or unclear.'],
    glossary: [{ term: 'Encumbrance', definition: 'A claim, lien, restriction, or other burden affecting property.' }, { term: 'Title search', definition: 'A review of public records affecting ownership and interests.' }],
    question: 'When the title result is unclear, what is the safer action?', answers: ['Assume it is clean', 'Increase the bid', 'Pause and get qualified help'], correctAnswer: 2,
  },
  {
    id: 'property-condition', title: 'Verify access and condition', duration: '9 min', summary: 'Assess what can be observed legally and what remains unknown.',
    transcript: ['Do not trespass or assume interior access.', 'Use lawful exterior observation, maps, public records, permit history, and professional inspections when available. Record every unknown as a risk, not as a favorable assumption.'],
    glossary: [{ term: 'Occupancy', definition: 'Whether and by whom a property is currently occupied.' }, { term: 'Desktop review', definition: 'Research performed from records and imagery without entering the property.' }],
    question: 'How should an unknown repair issue be handled?', answers: ['Ignore it', 'Treat it as a risk allowance', 'Count it as profit'], correctAnswer: 1,
  },
  {
    id: 'maximum-bid', title: 'Calculate a maximum bid', duration: '12 min', summary: 'Turn verified inputs, costs, and uncertainty into a bid ceiling.',
    transcript: ['Start with a supportable exit value, then subtract repairs, carrying costs, sale costs, liens or obligations, contingency, and the minimum return you require.', 'A maximum bid is a decision limit, not a prediction of the winning price. If required inputs are missing, the calculation is not bid-ready.'],
    glossary: [{ term: 'Contingency', definition: 'A reserve for uncertainty and unplanned costs.' }, { term: 'Maximum bid', definition: 'The highest amount allowed by your documented assumptions and return target.' }],
    question: 'What should happen when a required input is missing?', answers: ['Mark the calculation incomplete', 'Use zero', 'Bid the opening amount'], correctAnswer: 0,
  },
  {
    id: 'auction-to-payment', title: 'From auction to payment', duration: '11 min', summary: 'Prepare registration, deposits, payment deadlines, and post-sale tasks.',
    transcript: ['Read registration, deposit, bidding, payment, deed or certificate, and post-sale instructions before the auction.', 'Deadlines can be short and missing one can forfeit a deposit or award. Put each controlling deadline in your tracker and verify changes on the official source.'],
    glossary: [{ term: 'Deposit', definition: 'Funds required to register, bid, or secure an award.' }, { term: 'Redemption period', definition: 'A statutory period in which an owner or other party may redeem, where applicable.' }],
    question: 'Where should payment deadlines come from?', answers: ['The current official rules', 'A forum comment', 'A generic checklist'], correctAnswer: 0,
  },
]

export const BUYER_CHECKLIST = [
  'Confirm sale type and selling authority',
  'Match address, parcel ID, case number, and legal description',
  'Recheck sale status, auction date, opening amount, and deposit',
  'Review title, liens, parties, notices, and redemption rules',
  'Verify lawful access, occupancy signals, condition, permits, and utilities',
  'Document value source, repair allowance, holding and sale costs',
  'Calculate and record a maximum bid with contingency',
  'Calendar registration, auction, payment, and post-sale deadlines',
  'Save official documents and a final source-verification timestamp',
]
