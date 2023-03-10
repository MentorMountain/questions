import express, { Express } from "express";
import cors from "cors";
import Firestore from "@google-cloud/firestore";
import { Question } from "./src/model/Question";
import { QuestionResponse } from "./src/model/QuestionResponse";


//TODO when hosting to cloud run:
// add our credentials to process.env, e.g. the ProjectId
const firestore = new Firestore({
  
  projectId: process.env.ProjectId,
  timestampsInSnapshots: true
  // NOTE: Don't hardcode your project credentials here.
  // If you have to, export the following to your shell:
  //   GOOGLE_APPLICATION_CREDENTIALS=<path>
  // keyFilename: '/cred/cloud-functions-firestore-000000000000.json',
});

const app: Express = express();
const port = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

app.use(cors({
  origin: '*'
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", (req, _, next) => {
  console.log("\n> Request URL:", req.originalUrl, "| Method:", req.method);
  next();
});

// Create question
app.post("/api/questions", (req, res) => {
  /* Validation
      - Ensure responder is a student
      uuid: string;
    authorUUID: string;
    date: number;
    title: string;
    content: string;
  */
  const created = new Date().getTime();
  const submissionData:Question = {
    // uuid left blank for now
    authorUUID: "123", // filler authorUUID
    date: created, //date
    title: req.body.title,//title
    content: req.body.content //content
  }
      firestore.collection("questions").add({
        submissionData
      }).then((doc: any) => {
        console.info('stored new doc id#', doc.id);
        return res.status(200).send(doc);
      }).catch((err: any) => {
        console.error(err);
        return res.status(404).send({
          error: 'unable to upload new question',
          err
        });
      });
});

// Get question thread, given the thread's id
//params: id in param of request

//Given a question id,returns the content of that question, followed by the questionResponses
app.get("/api/questions/:questionUUID", (req, res) => {
  return firestore.collection("questions")
    .doc(req.params.questionUUID)
    .get()
    .then((doc: any) => {
      //get all associated QuestionResponses given a Question uuid
      firestore.collection("questionResponses")
      .where(doc.questionUUID == req.params.questionUUID)
      .get()
      .then((doc: QuestionResponse[]) => {
        if (!doc) {
          return res.status(404).send({
            error: 'Unable to find the questionResponses'
          });
        }
      }).catch((err:any) => {
        console.error(err);
        return res.status(404).send({
          error: 'Unable to retrieve the Question',
          err
        });
      });
      //HHH TODO: make sure Doc is of type Questions
      if (!doc) {
        return res.status(404).send({
          error: 'Unable to find the question'
        });
      }
      //const data = doc.data();
      if (!data) {
        return res.status(404).send({
          error: 'Found document is empty'
        });
      }
      return res.status(200).send(data);
    }).catch((err:any) => {
      console.error(err);
      return res.status(404).send({
        error: 'Unable to retrieve the Question',
        err
      });
    });
});

// Respond to question
app.post("/api/questions/:questionUUID/responses", (req, res) => {
  const uuid = req.params.questionUUID;

  /* Validation
    - Ensure question exists
    - Ensure responder is a mentor
  */

  res.json("UNIMPLEMENTED");
});

// Get questions UUIDs
app.get("/api/questions", (req, res) => {
  const questionUUIDs = [];
  //query firestore for all question ids, returning them in an array

  return firestore.collection("questions")
    .select("id")//only return the id column
    .then((data : any) => {
      //maybe need to parse data here?

      //get question ids from data
      res.status(200).json(data);
    }).catch((err : any) => {
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
