const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve static files from "public"
app.use(express.static(path.join(__dirname, "public")));

// ✅ Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const collection = db.collection("trackers");

// ✅ GET all data (flattened per entry)
app.get("/api/data", async (req, res) => {
  try {
    const snapshot = await collection.get();
    let allEntries = [];

    snapshot.forEach(doc => {
      const email = doc.id;
      const { entries } = doc.data();
      if (entries && Array.isArray(entries)) {
        entries.forEach((entry, index) => {
          allEntries.push({ _id: `${email}_${index}`, email, index, ...entry });
        });
      }
    });

    res.json(allEntries);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

// ✅ POST - Append data under same email
app.post("/api/data", async (req, res) => {
  const { email, ...entryData } = req.body;

  if (!email) return res.status(400).send("Email is required");

  try {
    const docRef = collection.doc(email);
    const doc = await docRef.get();

    if (doc.exists) {
      const existing = doc.data().entries || [];
      await docRef.update({
        entries: [...existing, entryData],
      });
    } else {
      await docRef.set({ entries: [entryData] });
    }

    res.status(200).json({ message: "✅ Data saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});

// ✅ PUT - Update approval/reason for specific entry
// ✅ PUT - Update a specific entry by email and index
app.put("/api/data/:email/:index", async (req, res) => {
  const { email, index } = req.params;
  const updateData = req.body;

  try {
    const docRef = collection.doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send("Document not found");
    }

    const entries = doc.data().entries || [];

    if (entries[index]) {
      entries[index] = { ...entries[index], ...updateData }; // merge updates
      await docRef.update({ entries });
      res.sendStatus(200);
    } else {
      res.status(404).send("Entry not found at specified index");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating entry");
  }
});


// ✅ DELETE specific entry by index from an email doc
app.delete("/api/data/:email/:index", async (req, res) => {
  const { email, index } = req.params;

  try {
    const docRef = collection.doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send("Document not found");
    }

    const entries = doc.data().entries || [];
    entries.splice(index, 1); // remove the specific entry

    await docRef.update({ entries });
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting entry");
  }
});

// ✅ Start server
app.listen(3000, () => {
  console.log("✅ Server is running at http://localhost:3000");
  console.log("🌐 USER page: http://localhost:3000/USER.html");
  console.log("🛠️ ADMIN page: http://localhost:3000/ADMIN.html");
});



