import { z } from "zod";

export const CaseFileCategorySchema = z.enum([
  "main_contract",
  "appendix",
  "disagreement_document",
  "client_note_attachment",
  "analysis_result_attachment",
  "other",
]);

