import { Timestamp } from "@google-cloud/firestore";

export interface Question {
    uuid?: string;
    authorUUID: string;
    date: Timestamp;
    title: string;
    content: string;
}