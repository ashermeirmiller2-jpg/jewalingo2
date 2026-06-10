import { useMemo, useState } from "react";
import type { ApiWord, FillFunctionExercise } from "../../types";
import OptionButton from "../../components/OptionButton";
import type { OptionState } from "../../components/OptionButton";
import FeedbackBar from "../../components/FeedbackBar";

interface NormOption {
  id: string;
  text: string;
}

/** The sentence with one function word blanked; choose the right word from 4 options. */
export default function FillFunction({
  exercise,
  fallbackWords,
  onDone,
}: {
  exercise: FillFunctionExercise;
  fallbackWords: ApiWord[];
  onDone: () => void;
}) {
  const sentenceWords = useMemo(() => {
    const text = exercise.sentence ?? exercise.textVowel;
    if (text) return text.split(/\s+/).filter(Boolean);
    return fallbackWords.map((w) => w.vowel);
  }, [exercise, fallbackWords]);

  const blankIndex = useMemo(() => {
    if (exercise.blankIndex !== undefined) return exercise.blankIndex;
    if (exercise.blankWord) {
      const i = sentenceWords.indexOf(exercise.blankWord);
      if (i >= 0) return i;
    }
    const fi = fallbackWords.findIndex((w) => w.isFunction);
    return fi >= 0 ? fi : 0;
  }, [exercise, sentenceWords, fallbackWords]);

  const options: NormOption[] = useMemo(
    () =>
      (exercise.options ?? []).map((o, i) =>
        typeof o === "string" ? { id: String(i), text: o } : { id: o.id ?? String(i), text: o.text },
      ),
    [exercise],
  );

  const correctId = useMemo(() => {
    if (exercise.correctOptionId) return exercise.correctOptionId;
    if (exercise.correctIndex !== undefined) return options[exercise.correctIndex]?.id;
    if (exercise.answer) return options.find((o) => o.text === exercise.answer)?.id;
    // Last resort: the option matching the blanked word.
    return options.find((o) => o.text === sentenceWords[blankIndex])?.id;
  }, [exercise, options, sentenceWords, blankIndex]);

  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const correct = answered && picked === correctId;

  const stateOf = (o: NormOption): OptionState => {
    if (!answered) return "idle";
    if (o.id === correctId) return "correct";
    if (o.id === picked) return "wrong";
    return "disabled";
  };

  return (
    <div className="pb-24">
      <h3 className="text-2xl font-semibold mb-1">Fill in the function word</h3>
      <p className="text-ink/55 mb-6">Which word makes the formula work?</p>

      <div dir="rtl" className="card p-6 font-aramaic text-3xl leading-loose flex flex-wrap gap-x-3 gap-y-2 mb-8">
        {sentenceWords.map((w, i) =>
          i === blankIndex ? (
            <span
              key={i}
              className={`inline-block min-w-[4.5rem] text-center border-b-4 rounded-sm px-2 ${
                answered
                  ? correct
                    ? "border-green-600 text-green-700"
                    : "border-gold text-gold"
                  : "border-gold/70 text-transparent"
              }`}
            >
              {answered ? options.find((o) => o.id === correctId)?.text ?? "—" : "؟"}
            </span>
          ) : (
            <span key={i}>{w}</span>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        {options.map((o) => (
          <OptionButton
            key={o.id}
            dir="rtl"
            state={stateOf(o)}
            onClick={() => !answered && setPicked(o.id)}
            className="font-aramaic text-2xl text-center"
          >
            {o.text}
          </OptionButton>
        ))}
      </div>

      <FeedbackBar
        open={answered}
        variant={correct ? "correct" : "incorrect"}
        title={correct ? "That's the function word!" : "Not that one"}
        detail={
          !correct && correctId
            ? `The formula needs: ${options.find((o) => o.id === correctId)?.text ?? ""}`
            : undefined
        }
        onAction={onDone}
      />
    </div>
  );
}
