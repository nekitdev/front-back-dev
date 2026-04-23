const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

const ROOT = "root";
const PASSWORD = process.env.DATABASE_PASSWORD;

mongoose
  .connect(`mongodb://${ROOT}:${PASSWORD}@127.0.0.1:27017/admin`)
  .then(() => console.log("connected to mongo"))
  .catch((error) => console.error(`connection error: ${error}`));

const schema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const USER_NAME = "User";

const USER_DELETED = "user deleted";

const User = mongoose.model(USER_NAME, schema);

app.post("/api/users", async (request, response) => {
  try {
    const user = await User.create(request.body);

    response.status(201).json(user);
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get("/api/users", async (request, response) => {
  try {
    const users = await User.find();

    response.status(200).json(users);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (request, response) => {
  try {
    const { id } = request.params;

    const user = await User.findById(id);

    if (!user) {
      response.status(404).json({ error: `user \`${id}\` not found` });
    } else {
      response.status(200).json(user);
    }
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:id", async (request, response) => {
  try {
    const { id } = request.params;

    const user = await User.findByIdAndUpdate(id, request.body, { new: true });

    if (!user) {
      response.status(404).json({ error: `user \`${id}\` not found` });
    } else {
      response.status(200).json(user);
    }
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (request, response) => {
  try {
    const { id } = request.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      response.status(404).json({ error: `user \`${id}\` not found` });
    } else {
      response.status(200).json({ message: USER_DELETED });
    }
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`running on http://localhost:${PORT}`);
});
