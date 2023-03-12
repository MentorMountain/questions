import { Timestamp } from "@google-cloud/firestore";

export interface Question {
    id?: string;
    authorID: string;
    date: number;
    title: string;
    content: string;
}