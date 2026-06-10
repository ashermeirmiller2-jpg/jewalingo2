import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getRefText } from '../services/sefaria.js';

export const classesRouter = Router();

classesRouter.get('/classes', async (_req, res) => {
  const classes = await prisma.classLesson.findMany({
    where: { verified: true },
    include: { moveType: { select: { name: true, isQuestionType: true, color: true } } },
    orderBy: { order: 'asc' },
  });
  res.json(
    classes.map((c) => ({ id: c.id, title: c.title, moveType: c.moveType })),
  );
});

classesRouter.get('/classes/:id', async (req, res) => {
  const lesson = await prisma.classLesson.findFirst({
    where: { id: req.params.id, verified: true },
    include: { moveType: { include: { formula: true } } },
  });
  if (!lesson) {
    res.status(404).json({ error: 'class not found' });
    return;
  }
  const body = lesson.body as Array<{ heading: string; text: string; exampleRefs?: string[] }>;
  const exampleRefs = [...new Set(body.flatMap((s) => s.exampleRefs ?? []))].slice(0, 3);
  const examples = await Promise.all(
    exampleRefs.map(async (ref) => {
      try {
        const t = await getRefText(ref); // verbatim Sefaria text only
        return { ref, vowel: t.vowel, plain: t.plain };
      } catch {
        return { ref, vowel: '', plain: '' };
      }
    }),
  );
  res.json({
    id: lesson.id,
    title: lesson.title,
    body,
    soWhat: lesson.soWhat,
    moveType: {
      name: lesson.moveType.name,
      hebrewName: lesson.moveType.hebrewName,
      particle: lesson.moveType.particle,
      color: lesson.moveType.color,
      isQuestionType: lesson.moveType.isQuestionType,
      demandsResolution: lesson.moveType.demandsResolution,
      formulaSkeleton: lesson.moveType.formula?.skeleton ?? null,
    },
    examples: examples.filter((e) => e.vowel),
    nearMissPairId: lesson.nearMissPairId,
  });
});
