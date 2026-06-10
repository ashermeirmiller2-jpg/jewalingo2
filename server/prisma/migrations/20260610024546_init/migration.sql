-- CreateEnum
CREATE TYPE "ReviewItemKind" AS ENUM ('FORMULA', 'LEIN', 'CONTRAST', 'MC', 'CLASS');

-- CreateEnum
CREATE TYPE "FsrsState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING');

-- CreateEnum
CREATE TYPE "FormulaCategory" AS ENUM ('ACQUISITION', 'CONDITIONAL', 'PRESUMPTION', 'INFERENCE', 'OBJECTION', 'AGENCY', 'COMPARISON', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseCategory" AS ENUM ('MONETARY', 'MARITAL', 'RITUAL', 'DAMAGES', 'AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "EdgeRelation" AS ENUM ('OBJECTS_TO', 'RESOLVES', 'PROVES', 'REFUTES', 'CONCLUDES', 'DEPENDS_ON', 'RESPONDS_TO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outsideMastery" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "plain" TEXT NOT NULL,
    "vowel" TEXT,
    "gloss" TEXT NOT NULL,
    "altGlosses" TEXT[],
    "isFunction" BOOLEAN NOT NULL DEFAULT false,
    "frequencyRank" INTEGER,
    "functionColor" TEXT,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReviewItemKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "state" "FsrsState" NOT NULL DEFAULT 'NEW',
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReview" TIMESTAMP(3),
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedRef" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "vowel" TEXT NOT NULL,
    "plain" TEXT NOT NULL,
    "enText" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL,
    "skeleton" TEXT NOT NULL,
    "display" TEXT,
    "category" "FormulaCategory" NOT NULL,
    "gloss" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaOccurrence" (
    "id" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "tractate" TEXT NOT NULL,
    "daf" TEXT NOT NULL,
    "textVowel" TEXT NOT NULL,
    "textPlain" TEXT NOT NULL,
    "sugyaRef" TEXT NOT NULL,
    "caseCategory" "CaseCategory" NOT NULL DEFAULT 'OTHER',
    "slotFillings" JSONB,

    CONSTRAINT "FormulaOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormulaPair" (
    "id" TEXT NOT NULL,
    "caseAId" TEXT NOT NULL,
    "caseBId" TEXT NOT NULL,
    "formulaAId" TEXT NOT NULL,
    "formulaBId" TEXT NOT NULL,
    "distanceDaf" INTEGER NOT NULL,
    "outcomeContrast" BOOLEAN NOT NULL DEFAULT false,
    "contrastNotes" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "newWordBudget" INTEGER NOT NULL DEFAULT 5,
    "explainerAId" TEXT,
    "explainerBId" TEXT,

    CONSTRAINT "FormulaPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Explainer" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mindmap" JSONB NOT NULL,
    "slides" JSONB NOT NULL,
    "script" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Explainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcceptableTranslation" (
    "id" TEXT NOT NULL,
    "occurrenceRef" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcceptableTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearMissExercise" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "baseFormulaId" TEXT NOT NULL,
    "variantFormulaId" TEXT NOT NULL,
    "changedWord" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NearMissExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugyaMoveType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hebrewName" TEXT,
    "particle" TEXT,
    "formulaId" TEXT,
    "description" TEXT NOT NULL,
    "soWhat" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isQuestionType" BOOLEAN NOT NULL DEFAULT false,
    "demandsResolution" BOOLEAN,

    CONSTRAINT "SugyaMoveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaggedSugya" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "tractate" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "aggadita" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TaggedSugya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArgumentNode" (
    "id" TEXT NOT NULL,
    "sugyaId" TEXT NOT NULL,
    "moveTypeId" TEXT NOT NULL,
    "spanRef" TEXT NOT NULL,
    "englishGloss" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ArgumentNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArgumentEdge" (
    "id" TEXT NOT NULL,
    "sugyaId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" "EdgeRelation" NOT NULL,

    CONSTRAINT "ArgumentEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugyaLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SugyaLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCQuestion" (
    "id" TEXT NOT NULL,
    "sugyaId" TEXT NOT NULL,
    "spanRef" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MCQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLesson" (
    "id" TEXT NOT NULL,
    "moveTypeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "soWhat" TEXT NOT NULL,
    "nearMissPairId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClassLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "Word_plain_key" ON "Word"("plain");

-- CreateIndex
CREATE UNIQUE INDEX "UserWord_userId_wordId_key" ON "UserWord"("userId", "wordId");

-- CreateIndex
CREATE INDEX "ReviewItem_userId_due_idx" ON "ReviewItem"("userId", "due");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_userId_kind_targetId_key" ON "ReviewItem"("userId", "kind", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedRef_ref_key" ON "CachedRef"("ref");

-- CreateIndex
CREATE INDEX "FormulaOccurrence_formulaId_idx" ON "FormulaOccurrence"("formulaId");

-- CreateIndex
CREATE INDEX "FormulaOccurrence_tractate_idx" ON "FormulaOccurrence"("tractate");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaPair_explainerAId_key" ON "FormulaPair"("explainerAId");

-- CreateIndex
CREATE UNIQUE INDEX "FormulaPair_explainerBId_key" ON "FormulaPair"("explainerBId");

-- CreateIndex
CREATE INDEX "FormulaPair_verified_confidence_idx" ON "FormulaPair"("verified", "confidence");

-- CreateIndex
CREATE INDEX "AcceptableTranslation_occurrenceRef_idx" ON "AcceptableTranslation"("occurrenceRef");

-- CreateIndex
CREATE UNIQUE INDEX "SugyaMoveType_name_key" ON "SugyaMoveType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaggedSugya_ref_key" ON "TaggedSugya"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "SugyaLink_fromId_toId_pattern_key" ON "SugyaLink"("fromId", "toId", "pattern");

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaOccurrence" ADD CONSTRAINT "FormulaOccurrence_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_formulaAId_fkey" FOREIGN KEY ("formulaAId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_formulaBId_fkey" FOREIGN KEY ("formulaBId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_caseAId_fkey" FOREIGN KEY ("caseAId") REFERENCES "FormulaOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_caseBId_fkey" FOREIGN KEY ("caseBId") REFERENCES "FormulaOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_explainerAId_fkey" FOREIGN KEY ("explainerAId") REFERENCES "Explainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormulaPair" ADD CONSTRAINT "FormulaPair_explainerBId_fkey" FOREIGN KEY ("explainerBId") REFERENCES "Explainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearMissExercise" ADD CONSTRAINT "NearMissExercise_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "FormulaPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearMissExercise" ADD CONSTRAINT "NearMissExercise_baseFormulaId_fkey" FOREIGN KEY ("baseFormulaId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NearMissExercise" ADD CONSTRAINT "NearMissExercise_variantFormulaId_fkey" FOREIGN KEY ("variantFormulaId") REFERENCES "Formula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugyaMoveType" ADD CONSTRAINT "SugyaMoveType_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "Formula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgumentNode" ADD CONSTRAINT "ArgumentNode_sugyaId_fkey" FOREIGN KEY ("sugyaId") REFERENCES "TaggedSugya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgumentNode" ADD CONSTRAINT "ArgumentNode_moveTypeId_fkey" FOREIGN KEY ("moveTypeId") REFERENCES "SugyaMoveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgumentEdge" ADD CONSTRAINT "ArgumentEdge_sugyaId_fkey" FOREIGN KEY ("sugyaId") REFERENCES "TaggedSugya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgumentEdge" ADD CONSTRAINT "ArgumentEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "ArgumentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArgumentEdge" ADD CONSTRAINT "ArgumentEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "ArgumentNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugyaLink" ADD CONSTRAINT "SugyaLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "TaggedSugya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugyaLink" ADD CONSTRAINT "SugyaLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "TaggedSugya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQuestion" ADD CONSTRAINT "MCQuestion_sugyaId_fkey" FOREIGN KEY ("sugyaId") REFERENCES "TaggedSugya"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLesson" ADD CONSTRAINT "ClassLesson_moveTypeId_fkey" FOREIGN KEY ("moveTypeId") REFERENCES "SugyaMoveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
