import { Timestamp } from "@google-cloud/firestore";

export interface Question {
    uuid?: string;
    authorUUID: string;
    date: number;
    title: string;
    content: string;
}