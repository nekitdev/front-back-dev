const express = require("express");

const { Sequelize, DataTypes } = require("sequelize");

const app = express();

app.use(express.json());

const NAME = "nekit";
const USER = "nekit";
const PASSWORD = process.env.DATABASE_PASSWORD;
const HOST = "localhost";
const DIALECT = "postgres";
const PORT = 5432;

const sequelize = new Sequelize(NAME, USER, PASSWORD, {
  host: HOST,
  dialect: DIALECT,
  port: PORT,
});

sequelize
  .authenticate()
  .then(() => console.log("connected to the database"))
  .catch((error) => console.error(`connection error: ${error}`));

const USER_NAME = "User";

const USER_DELETED = "user deleted";

const User = sequelize.define(
  USER_NAME,
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
);

sequelize.sync({ force: true });

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
    const users = await User.findAll();
    response.status(200).json(users);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id", async (request, response) => {
  try {
    const { id } = request.params;

    const user = await User.findByPk(id);

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

    const [count, users] = await User.update(request.body, {
      where: { id },
      returning: true,
    });

    if (!count) {
      response.status(404).json({
        error: `user \`${id}\` not found`,
      });
    } else {
      const user = users[0];

      response.status(200).json(user);
    }
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (request, response) => {
  try {
    const { id } = request.params;

    const count = await User.destroy({ where: { id } });

    if (!count) {
      response.status(404).json({ error: `user \`${id}\` not found` });
    } else {
      response.status(200).json({ message: USER_DELETED });
    }
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

const SERVER = 3000;

app.listen(SERVER, () => {
  console.log(`running on http://localhost:${SERVER}`);
});
