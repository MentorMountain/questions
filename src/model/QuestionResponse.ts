import { Timestamp } from "@google-cloud/firestore";

export interface QuestionResponse {
  uuid?: string;
  questionUUID: string;
  authorUUID: string;
  date: Timestamp;
  message: string;
}
