import type { SignalName } from '../nlp/signals';

/** Everything needed to turn a petition into a score. Serialised to weights.json. */
export type TrainedModel = {
  /** Bumped whenever the feature layout changes, so stale weights fail loudly. */
  version: number;
  /** feature string -> column index in the tf-idf block */
  vocabulary: Record<string, number>;
  /** inverse document frequency, one per vocabulary column */
  idf: number[];
  /** the engineered signals appended after the tf-idf block, in order */
  signals: SignalName[];
  /** one weight per column: vocabulary.length + signals.length */
  weights: number[];
  bias: number;
  /**
   * Below 0.5 on purpose. The definition says an unclear petition is treated as
   * engine-built and left to the moat score to judge, so the cost of the two
   * mistakes is not symmetric. 0.45 also happened to be the best F1 in the sweep.
   */
  threshold: number;
  /** how the model scored on data it never saw during training */
  metrics: {
    folds: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1: number;
    trainedOn: number;
  };
};
