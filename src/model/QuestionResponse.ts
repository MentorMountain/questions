import { Timestamp } from "@google-cloud/firestore";

export interface QuestionResponse {
  id?: string;
  questionID: string;
  authorID: string;
  date: number;
  message: string;
}
