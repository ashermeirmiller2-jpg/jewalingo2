/**
 * The high-frequency structural core of Talmudic Aramaic (toward the ~300-word
 * set behind the 80% coverage thesis). These are dictionary headwords with
 * English glosses — curated lexicon data, not generated passage text.
 *
 * Function color bars (existing reader convention): each grammatical role has
 * a consistent color rendered under the word.
 */

export const FUNCTION_COLORS = {
  conditional: '#2563eb', // blue — conditionals/hypotheticals
  interrogative: '#9333ea', // purple — question words
  connective: '#0d9488', // teal — conjunctions/discourse glue
  citation: '#b45309', // amber — quoting/teaching verbs
  demonstrative: '#be185d', // pink — this/that/these
  negation: '#dc2626', // red — negators
  relative: '#65a30d', // olive — relative/genitive particles
  existential: '#0369a1', // steel — there-is/there-isn't
  inference: '#7c3aed', // violet — logical inference markers
  other: '#c9a227', // burnished gold — general function words
} as const;

export interface CoreWord {
  plain: string;
  gloss: string;
  altGlosses?: string[];
  role: keyof typeof FUNCTION_COLORS;
}

export const CORE_FUNCTION_WORDS: CoreWord[] = [
  // citation / teaching verbs
  { plain: 'אמר', gloss: 'said', altGlosses: ['says', 'stated'], role: 'citation' },
  { plain: 'אמרו', gloss: 'they said', role: 'citation' },
  { plain: 'אמרי', gloss: 'they say', role: 'citation' },
  { plain: 'דאמר', gloss: 'who said / as he said', role: 'citation' },
  { plain: 'אמרינן', gloss: 'we say', role: 'citation' },
  { plain: 'קאמר', gloss: 'he is saying', role: 'citation' },
  { plain: 'תנן', gloss: 'we learned (in a Mishnah)', role: 'citation' },
  { plain: 'תניא', gloss: 'it was taught (in a baraita)', role: 'citation' },
  { plain: 'תנא', gloss: 'a tanna taught', role: 'citation' },
  { plain: 'תנו', gloss: 'they taught', role: 'citation' },
  { plain: 'רבנן', gloss: 'the Rabbis', role: 'citation' },
  { plain: 'דתניא', gloss: 'as it was taught', role: 'citation' },
  { plain: 'דתנן', gloss: 'as we learned', role: 'citation' },
  { plain: 'כתיב', gloss: 'it is written', role: 'citation' },
  { plain: 'דכתיב', gloss: 'as it is written', role: 'citation' },
  { plain: 'שנאמר', gloss: 'as it is said', role: 'citation' },
  { plain: 'מר', gloss: 'the Master', role: 'citation' },
  { plain: 'רב', gloss: 'Rav', role: 'citation' },
  { plain: 'רבי', gloss: 'Rabbi', role: 'citation' },
  { plain: 'רבא', gloss: 'Rava', role: 'citation' },
  { plain: 'אביי', gloss: 'Abaye', role: 'citation' },
  { plain: 'שמואל', gloss: 'Shmuel', role: 'citation' },
  { plain: 'יוחנן', gloss: 'Yochanan', role: 'citation' },

  // interrogatives
  { plain: 'מאי', gloss: 'what?', role: 'interrogative' },
  { plain: 'מאן', gloss: 'who?', role: 'interrogative' },
  { plain: 'היכי', gloss: 'how?', role: 'interrogative' },
  { plain: 'היכא', gloss: 'where?', role: 'interrogative' },
  { plain: 'אמאי', gloss: 'why?', role: 'interrogative' },
  { plain: 'למה', gloss: 'why?', role: 'interrogative' },
  { plain: 'מנא', gloss: 'from where?', role: 'interrogative' },
  { plain: 'מנלן', gloss: 'from where do we know this?', role: 'interrogative' },
  { plain: 'מהו', gloss: 'what is (the law)?', role: 'interrogative' },
  { plain: 'מי', gloss: 'is it so that...?', role: 'interrogative' },
  { plain: 'הא', gloss: 'but / behold', role: 'interrogative' },
  { plain: 'ומה', gloss: 'and what / just as', role: 'interrogative' },
  { plain: 'איבעיא', gloss: 'it was asked (an open inquiry)', role: 'interrogative' },
  { plain: 'להו', gloss: 'to them', role: 'other' },
  { plain: 'בעי', gloss: 'asked / requires', role: 'interrogative' },
  { plain: 'קשיא', gloss: 'it is difficult', role: 'interrogative' },
  { plain: 'תיובתא', gloss: 'a refutation', role: 'interrogative' },
  { plain: 'תיקו', gloss: 'let it stand (unresolved)', role: 'interrogative' },

  // conditionals
  { plain: 'אי', gloss: 'if', role: 'conditional' },
  { plain: 'אם', gloss: 'if', role: 'conditional' },
  { plain: 'אילימא', gloss: 'if you say (first attempt)', role: 'conditional' },
  { plain: 'אלמא', gloss: 'evidently', role: 'conditional' },
  { plain: 'הניחא', gloss: 'this works (according to...)', role: 'conditional' },
  { plain: 'נמי', gloss: 'also', role: 'conditional' },
  { plain: 'אפילו', gloss: 'even', role: 'conditional' },
  { plain: 'ואפילו', gloss: 'and even', role: 'conditional' },
  { plain: 'דאי', gloss: 'for if', role: 'conditional' },
  { plain: 'ואי', gloss: 'and if', role: 'conditional' },
  { plain: 'אלא', gloss: 'rather / only', role: 'conditional' },
  { plain: 'ואלא', gloss: 'but rather', role: 'conditional' },

  // negation
  { plain: 'לא', gloss: 'not / no', role: 'negation' },
  { plain: 'ולא', gloss: 'and not', role: 'negation' },
  { plain: 'אין', gloss: 'there is not / one may not', altGlosses: ['yes (in answers)'], role: 'negation' },
  { plain: 'ואין', gloss: 'and there is not', role: 'negation' },
  { plain: 'לאו', gloss: 'is it not / a negative', role: 'negation' },
  { plain: 'שלא', gloss: 'that not / without', role: 'negation' },
  { plain: 'דלא', gloss: 'that not', role: 'negation' },
  { plain: 'לית', gloss: 'there is not (Aramaic)', role: 'negation' },

  // existential
  { plain: 'איכא', gloss: 'there is', role: 'existential' },
  { plain: 'ליכא', gloss: 'there is not', role: 'existential' },
  { plain: 'אית', gloss: 'there is (Aramaic)', role: 'existential' },
  { plain: 'איתא', gloss: 'it is so / it exists', role: 'existential' },
  { plain: 'ליתא', gloss: 'it is not so', role: 'existential' },
  { plain: 'הוי', gloss: 'is / becomes', role: 'existential' },
  { plain: 'הוה', gloss: 'was', role: 'existential' },
  { plain: 'הוא', gloss: 'he / it (is)', role: 'existential' },
  { plain: 'היא', gloss: 'she / it (is)', role: 'existential' },
  { plain: 'הן', gloss: 'they (are)', role: 'existential' },
  { plain: 'נינהו', gloss: 'they are', role: 'existential' },

  // demonstratives & pronouns
  { plain: 'האי', gloss: 'this', role: 'demonstrative' },
  { plain: 'ההוא', gloss: 'that / a certain', role: 'demonstrative' },
  { plain: 'ההיא', gloss: 'that (f.) / a certain', role: 'demonstrative' },
  { plain: 'הך', gloss: 'that / this one', role: 'demonstrative' },
  { plain: 'הנך', gloss: 'those', role: 'demonstrative' },
  { plain: 'הני', gloss: 'these', role: 'demonstrative' },
  { plain: 'זה', gloss: 'this', role: 'demonstrative' },
  { plain: 'זו', gloss: 'this (f.)', role: 'demonstrative' },
  { plain: 'אותו', gloss: 'that / him', role: 'demonstrative' },
  { plain: 'אותה', gloss: 'that (f.) / her', role: 'demonstrative' },
  { plain: 'מידי', gloss: 'anything / a thing', role: 'demonstrative' },
  { plain: 'מילתא', gloss: 'a matter / thing', role: 'demonstrative' },
  { plain: 'גופא', gloss: 'itself / the thing itself', role: 'demonstrative' },

  // relative / genitive
  { plain: 'של', gloss: 'of / belonging to', role: 'relative' },
  { plain: 'את', gloss: '(object marker)', role: 'relative' },
  { plain: 'דידיה', gloss: 'his', role: 'relative' },
  { plain: 'דידה', gloss: 'hers', role: 'relative' },
  { plain: 'דידהו', gloss: 'theirs', role: 'relative' },
  { plain: 'מאי לאו', gloss: 'is it not that...?', role: 'relative' },

  // connectives / discourse glue
  { plain: 'ו', gloss: 'and', role: 'connective' },
  { plain: 'או', gloss: 'or', role: 'connective' },
  { plain: 'אבל', gloss: 'but', role: 'connective' },
  { plain: 'אף', gloss: 'also / even', role: 'connective' },
  { plain: 'גם', gloss: 'also', role: 'connective' },
  { plain: 'כי', gloss: 'when / because / like', role: 'connective' },
  { plain: 'דהא', gloss: 'for behold', role: 'connective' },
  { plain: 'והא', gloss: 'but behold', role: 'connective' },
  { plain: 'הכא', gloss: 'here', role: 'connective' },
  { plain: 'התם', gloss: 'there', role: 'connective' },
  { plain: 'הכי', gloss: 'so / thus', role: 'connective' },
  { plain: 'והכי', gloss: 'and so', role: 'connective' },
  { plain: 'אדרבה', gloss: 'on the contrary', role: 'connective' },
  { plain: 'מיהו', gloss: 'however', role: 'connective' },
  { plain: 'מיהא', gloss: 'at any rate', role: 'connective' },
  { plain: 'אגב', gloss: 'by the way of / along with', role: 'connective' },
  { plain: 'משום', gloss: 'because of', role: 'connective' },
  { plain: 'דקא', gloss: 'that he is', role: 'connective' },
  { plain: 'קא', gloss: '(present-action marker)', role: 'connective' },
  { plain: 'מכלל', gloss: 'it follows from this', role: 'connective' },
  { plain: 'בשלמא', gloss: 'granted / it works for', role: 'connective' },
  { plain: 'לעולם', gloss: 'actually / always', role: 'connective' },
  { plain: 'דווקא', gloss: 'specifically', role: 'connective' },
  { plain: 'לאפוקי', gloss: 'to exclude', role: 'connective' },
  { plain: 'לרבות', gloss: 'to include', role: 'connective' },

  // inference markers
  { plain: 'שמע', gloss: 'hear / derive', role: 'inference' },
  { plain: 'מינה', gloss: 'from it', role: 'inference' },
  { plain: 'דייקא', gloss: 'it is precise', role: 'inference' },
  { plain: 'משמע', gloss: 'it implies', role: 'inference' },
  { plain: 'סלקא', gloss: 'it arises', role: 'inference' },
  { plain: 'דעתך', gloss: 'your mind (in: it might enter your mind)', role: 'inference' },
  { plain: 'סברא', gloss: 'logical reasoning', role: 'inference' },
  { plain: 'סבר', gloss: 'holds / reasons', role: 'inference' },
  { plain: 'קסבר', gloss: 'he holds', role: 'inference' },
  { plain: 'כל', gloss: 'all / every', role: 'inference' },
  { plain: 'שכן', gloss: 'so too / all the more so', role: 'inference' },
  { plain: 'חומר', gloss: 'stringency (kal va-chomer)', role: 'inference' },
  { plain: 'מה', gloss: 'just as / what', role: 'inference' },
  { plain: 'מצינו', gloss: 'we have found', role: 'inference' },
  { plain: 'ילפינן', gloss: 'we derive', role: 'inference' },
  { plain: 'גמר', gloss: 'derives / learns', role: 'inference' },
  { plain: 'חזקה', gloss: 'presumption', role: 'inference' },
  { plain: 'ראיה', gloss: 'a proof', role: 'inference' },
  { plain: 'טעמא', gloss: 'the reason', role: 'inference' },
  { plain: 'מאי טעמא', gloss: 'what is the reason?', role: 'inference' },

  // common verbs/prepositions in the structural core
  { plain: 'יש', gloss: 'there is', role: 'existential' },
  { plain: 'אדם', gloss: 'a person', role: 'other' },
  { plain: 'לאדם', gloss: 'for a person', role: 'other' },
  { plain: 'זכין', gloss: 'one may act to benefit', role: 'other' },
  { plain: 'חבין', gloss: 'one may act to the detriment of', role: 'other' },
  { plain: 'בפניו', gloss: 'in his presence', role: 'other' },
  { plain: 'דבר', gloss: 'a thing / matter', role: 'other' },
  { plain: 'דברי', gloss: 'the words of', role: 'citation' },
  { plain: 'חייב', gloss: 'liable / obligated', role: 'other' },
  { plain: 'פטור', gloss: 'exempt', role: 'other' },
  { plain: 'אסור', gloss: 'forbidden', role: 'other' },
  { plain: 'מותר', gloss: 'permitted', role: 'other' },
  { plain: 'כשר', gloss: 'valid / fit', role: 'other' },
  { plain: 'פסול', gloss: 'invalid / unfit', role: 'other' },
  { plain: 'קנה', gloss: 'acquired', role: 'other' },
  { plain: 'קני', gloss: 'acquires', role: 'other' },
  { plain: 'קנין', gloss: 'an act of acquisition', role: 'other' },
  { plain: 'גט', gloss: 'a bill of divorce', role: 'other' },
  { plain: 'אשה', gloss: 'a woman / wife', role: 'other' },
  { plain: 'איש', gloss: 'a man', role: 'other' },
  { plain: 'עבד', gloss: 'a slave / servant', role: 'other' },
  { plain: 'יד', gloss: 'hand / possession', role: 'other' },
  { plain: 'ידו', gloss: 'his hand', role: 'other' },
  { plain: 'שליח', gloss: 'an agent', role: 'other' },
  { plain: 'שליחות', gloss: 'agency', role: 'other' },
  { plain: 'ממון', gloss: 'money / property', role: 'other' },
  { plain: 'מציאה', gloss: 'a found object', role: 'other' },
  { plain: 'חצר', gloss: 'a courtyard', role: 'other' },
  { plain: 'חצרו', gloss: 'his courtyard', role: 'other' },
  { plain: 'משום שנאמר', gloss: 'because it is said', role: 'citation' },
  { plain: 'בעל', gloss: 'husband / owner', role: 'other' },
  { plain: 'חוב', gloss: 'a debt / detriment', role: 'other' },
  { plain: 'זכות', gloss: 'a benefit / merit', role: 'other' },
  { plain: 'דאמרינן', gloss: 'as we say', role: 'citation' },
  { plain: 'והלכתא', gloss: 'and the halacha is', role: 'inference' },
  { plain: 'הלכה', gloss: 'the law', role: 'inference' },
  { plain: 'מתניתין', gloss: 'our Mishnah', role: 'citation' },
  { plain: 'ברייתא', gloss: 'a baraita', role: 'citation' },
  { plain: 'סיפא', gloss: 'the latter clause', role: 'citation' },
  { plain: 'רישא', gloss: 'the first clause', role: 'citation' },
];
