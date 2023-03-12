import express, { Express } from "express";
import cors from "cors";
import { Firestore, QueryDocumentSnapshot, QuerySnapshot, Timestamp } from "@google-cloud/firestore";
import { Question } from "./src/model/Question";
import { QuestionResponse } from "./src/model/QuestionResponse";

//TODO when hosting to cloud run:
//Add your credentials to process.env, e.g. the ProjectId
const firestore = new Firestore({
  projectId: process.env.ProjectId,
  timestampsInSnapshots: true
});

const app: Express = express();
const port = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

app.use(cors({
  origin: '*'
}));

/******************************************************************************
 *                             Datastore Constants                            *
 ******************************************************************************/
// Firestore states field value length limit for indexed fields as 1,500 bytes
// - UTF-8 chars take up 2 bytes each: therefore 750 character length limit
// If you want to increase this limit, verify that we are using NON-INDEXED...
// ...field values 
// See: https://firebase.google.com/docs/firestore/quotas#limits
const GCLOUD_STRING_LENGTH_LIMIT = 750;
// DB_STR_LIMIT slightly shorter for safety
const DB_STR_LIMIT = GCLOUD_STRING_LENGTH_LIMIT - 50;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/******************************************************************************
 *                                API Endpoints                               *
 ******************************************************************************/

app.use("/", (req, _, next) => {
  console.log("\n> Request URL:", req.originalUrl, "| Method:", req.method);
  next();
});

//POST new Question
app.post("/api/questions", (req, res) => {
  /* Validation
      - TODO: Ensure responder is a student
      uuid: string;
    authorUUID: string;
    date: number;
    title: string;
    content: string;
  */
  // uuid left blank for now, generated in firestore.
  const created: Timestamp = Timestamp.now()
  const submissionData: Question = {
    authorUUID: "123", // TODO: set proper authorUUID once users service is online
    date: created, //date
    title: req.body.title,//title
    content: req.body.content //content
  }
  firestore.collection("questions").add(
    submissionData
  ).then((doc: any) => {
    console.info('stored new doc', doc);
    return res.status(200).send(doc);
  }).catch((err: any) => {
    console.error(err);
    return res.status(404).send({
      error: 'Unable to upload new question',
      err
    });
  });
});

// GET question title and content, given the question's id
//params: id in param of request
app.get("/api/questions/:questionUUID", (req, res) => {
  return firestore.collection("questions")
    .doc(req.params.questionUUID)
    .get()
    .then((doc: any) => {
      //HHH TODO: make sure Doc is of type Question
      return res.status(200).send(doc);
    }).catch((err: any) => {
      console.error(err);
      return res.status(404).send({
        error: 'Unable to retrieve the Question',
        err
      });
    });
});

//Get QuestionResponses
//Given a Question id, returns the collection of related Responses
app.get("/api/questions/:questionUUID/responses", (req, res) => {
  const qResponseArray: QuestionResponse[] = [];
  firestore.collection("QuestionResponses")
    .where("questionUUID", "==", req.params.questionUUID)
    .get()
    .then((qResponses: QuerySnapshot) => {
      if (qResponses.docs.length === 0) {
        return res.status(404).send({
          error: 'Unable to find the questionResponses'
        });
      }
      qResponses.forEach((qResponse: QueryDocumentSnapshot) => {
        //push each questionResponse to the array we will return
        const data = qResponse.data();
        qResponseArray.push({
          message: data.message,
          questionUUID: data.questionUUID,
          date: data.date,
          authorUUID: data.authorUUID,
        });
      });
      const responseData: string = JSON.stringify(qResponseArray);
      console.log('send data in response:', responseData);
      //return res.status(200).send(responseData); //uncomment if you only want the Array.
      return res.status(200).send(
        {
          qResponseObject: qResponses,
          responses: responseData,
        });
    }).catch((err: any) => {
      console.error(err);
      return res.status(404).send({
        error: 'Unable to retrieve the Question',
        err
      });
    });
});

// POST QuestionResponse
app.post("/api/questions/:questionUUID/responses", (req, res) => {
  const uuid = req.params.questionUUID;
  firestore.collection("questions")
    .doc(req.params.questionUUID)
    .get()
    .then((doc: any) => {
      if (doc.exists && doc.get("title")) {
        //continue to post a Qresponse
        const created: Timestamp = Timestamp.now();
        const submissionData: QuestionResponse = {
          questionUUID: req.params.questionUUID,
          authorUUID: "123",// filler authorUUID for version 1
          date: created,
          message: req.body.message,
        };
        firestore
          .collection("QuestionResponses")
          .add(submissionData)
          .then((doc: any) => {
            console.info("stored new QuestionResponse", doc);
            return res.status(200).send();
          })
          .catch((err: any) => {
            console.error(err);
            return res.status(404).send({
              error: "unable to upload new QuestionResponse",
              err,
            });
          });
      } else {
        return res.status(404).send({
          error: "Invalid Question to add response to",
        });
      }
    })
    .catch((err: any) => {
      console.error(err);
      return res.status(404).send({
        error:
          "Unable to validate Question. Try checking that your question ID exists",
        err,
      });
    });
  /* Validation Todos for v2
  - Ensure responder is a mentor
*/
});

// GET all Question UUIDs
app.get("/api/questions", (req, res) => {
  const questionUUIDs: any = [];
  //query firestore for all question ids, returning them in an array
  return firestore.collection("questions")
    .get()
    .then((data: any) => {
      data.forEach((doc: any) => {
        questionUUIDs.push(doc.id);
      });
      res.status(200).json(questionUUIDs);
    }).catch((err: any) => {
      console.error(err);
      res.status(404).send({
        error: 'Unable to retrieve the question ids',
        err
      });
    });
});

app.get("/api/health", (_, res) => {
  res.json({
    health: "OK",
  });
});

app.listen(port, () => {
  console.log(`Attaching to port ${port}`);
});
