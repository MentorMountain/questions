import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import {
  DocumentReference,
  Firestore,
  QueryDocumentSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  DocumentData,
} from "@google-cloud/firestore";
import { Question } from "./src/model/Question";
import { QuestionResponse } from "./src/model/QuestionResponse";
import {
  LoginTokenizedRequest,
  LoginTokenParameters,
  validateLoginToken,
} from "cmpt474-mm-jwt-middleware";
import ENV from "./env";

//TODO when hosting to cloud run:
//Add your credentials to process.env, e.g. the ProjectId
const firestore: Firestore = new Firestore({
  projectId: ENV.PROJECT_ID,
  timestampsInSnapshots: true,
});

const QUESTIONS_COLLECTION: string = ENV.DB_COLLECTION_NAME;
const QUESTION_RESPONSES_COLLECTION: string = "QuestionResponses";

const app: Express = express();
const port: number = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", cors({ origin: "*" }), (_: Request, res: Response) => {
  res.json({
    health: "OK",
  });
});

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if ([ENV.WEBAPP_DOMAIN, "http://localhost:3000"].indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

const LOGIN_TOKEN_VALIDATION_PARAMETERS: LoginTokenParameters = {
  JWT_SECRET: ENV.JWT_SECRET,
  GATEWAY_DOMAIN: ENV.GATEWAY_DOMAIN,
  WEBAPP_DOMAIN: ENV.WEBAPP_DOMAIN,
};
const LOGIN_TOKEN_VALIDATOR = validateLoginToken(
  LOGIN_TOKEN_VALIDATION_PARAMETERS
);

/******************************************************************************
 *                             Datastore Constants                            *
 ******************************************************************************/
// Firestore states field value length limit for indexed fields as 1,500 bytes
// - UTF-8 chars take up 2 bytes each: therefore 750 character length limit
// If you want to increase this limit, verify that we are using NON-INDEXED...
// ...field values
// See: https://firebase.google.com/docs/firestore/quotas#limits
const GCLOUD_STRING_LENGTH_LIMIT: number = 750;
// DB_STR_LIMIT slightly shorter for safety
const DB_STR_LIMIT: number = GCLOUD_STRING_LENGTH_LIMIT - 50;

/******************************************************************************
 *                              Helper Functions                              *
 ******************************************************************************/
// Reduce the length of the (string) field in a request such that it meets...
// ...the gcloud length limit - whitespace is trimmed too
const cleanRequestField = (requestField: string): string => {
  return requestField.trim().substring(0, DB_STR_LIMIT);
};

/******************************************************************************
 *                                API Endpoints                               *
 ******************************************************************************/

app.use("/", (req: Request, _: Response, next: NextFunction) => {
  console.log("\n> Request URL:", req.originalUrl, "| Method:", req.method);
  next();
});

app.use(LOGIN_TOKEN_VALIDATOR);

//POST new Question
app.post("/api/questions", (req: Request, res: Response) => {
  const request = req as LoginTokenizedRequest;
  /* Validation
      - TODO: Ensure responder is a student
      id: string;
      date: number;
      title: string;
      content: string;
  */
  //systemRequest.user.username
  if (request.user.role !== "student") {
    //only students can post questions
    return res.status(403).send("Only Students can post questions.");
  }

  // id left blank for now, generated in firestore.
  const created: number = Date.now();
  // Cleaning up data before inserting into DB
  const title: string = cleanRequestField(request.body.title);
  const content: string = cleanRequestField(request.body.content);

  const submissionData: Question = {
    authorID: request.user.username,
    date: created,
    title: title,
    content: content,
  };

  firestore
    .collection(QUESTIONS_COLLECTION)
    .add(submissionData)
    .then((doc: DocumentReference) => {
      console.info("stored new doc", doc);
      return res.status(201).send();
    })
    .catch((err: any) => {
      console.error(err);
      return res.status(400).send();
    });
});

// GET question title and content, given the question's id
//params: id in param of request
app.get("/api/questions/:questionID", (req: Request, res: Response) => {
  return firestore
    .collection(QUESTIONS_COLLECTION)
    .doc(req.params.questionID)
    .get()
    .then((doc: DocumentSnapshot) => {
      return res.status(200).send(doc);
    })
    .catch((err: any) => {
      console.error(err);
      return res.status(400).send();
    });
});

//Get all QuestionResponses
//Given a Question id, returns the collection of related Responses
app.get(
  "/api/questions/:questionID/responses",
  (req: Request, res: Response) => {
    const qResponseArray: QuestionResponse[] = [];
    firestore
      .collection(QUESTION_RESPONSES_COLLECTION)
      .where("questionID", "==", req.params.questionID)
      .get()
      .then((qResponses: QuerySnapshot) => {
        if (qResponses.docs.length === 0) {
          return res.status(200).send([]);
        }
        qResponses.forEach((qResponse: QueryDocumentSnapshot) => {
          //push each questionResponse to the array we will return
          const data: DocumentData = qResponse.data();
          qResponseArray.push({
            id: qResponse.id,
            message: data.message,
            questionID: data.questionID,
            date: data.date,
            authorID: data.authorID,
          });
        });
        const responseData: string = JSON.stringify(qResponseArray);
        console.log("send data in response:", responseData);
        return res.status(200).send(responseData);
      })
      .catch((err: any) => {
        console.error(err);
        return res.status(400).send();
      });
  }
);

// POST QuestionResponse
app.post(
  "/api/questions/:questionID/responses",
  (req: Request, res: Response) => {
    const request: LoginTokenizedRequest = req as LoginTokenizedRequest;
    const questionId: string = req.params.questionID;

    if (request.user.role !== "mentor") {
      return res.status(403).send("Only Mentors can post responses to questions.");
    }

    firestore
      .collection(QUESTIONS_COLLECTION)
      .doc(questionId)
      .get()
      .then((doc: DocumentSnapshot) => {
        if (doc.exists) {
          //continue to post a Qresponse
          const created: number = Date.now();
          const message: string = cleanRequestField(req.body.message);
          const submissionData: QuestionResponse = {
            questionID: questionId,
            authorID: request.user.username,
            date: created,
            message: message,
          };
          firestore
            .collection(QUESTION_RESPONSES_COLLECTION)
            .add(submissionData)
            .then((doc: DocumentReference) => {
              console.info("stored new QuestionResponse", doc);
              return res.status(201).send();
            })
            .catch((err: any) => {
              console.error(err);
              return res.status(400).send({
                error: "Unable to add new Response.",
                err,
              });
            });
        } else {
          return res.status(404).send("Question Not Found");
        }
      })
      .catch((err: any) => {
        console.error(err);
        return res.status(400).send(err.textPayload);
      });
    /* Validation Todos for v2
  - Ensure responder is a mentor
*/
  }
);

// GET all Question IDs
//Queries the firestore database for all question ids, returning them in an array
app.get("/api/questions", (_: Request, res: Response) => {
  const questionIDs: string[] = [];
  //TODO: Look into doing this question-id-getter using a SELECT for greater efficiency.
  return firestore
    .collection(QUESTIONS_COLLECTION)
    .get()
    .then((data: QuerySnapshot) => {
      data.forEach((doc: QueryDocumentSnapshot) => {
        questionIDs.push(doc.id);
      });
      res.status(200).json(questionIDs);
    })
    .catch((err: any) => {
      console.error(err);
      res.status(400).send();
    });
});

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
