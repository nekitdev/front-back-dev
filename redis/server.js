const express = require("express");
const argon2 = require("argon2");
const redis = require("redis");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const PORT = 3000;

const redisClient = redis.createClient({
  url: "redis://127.0.0.1:6379",
});

redisClient.on("error", (error) => {
  console.error(`redis error: ${error}`);
});

const initRedis = async () => {
  await redisClient.connect();
  console.log("redis connected");
};

const ACCESS_SECRET = "access_secret";
const REFRESH_SECRET = "refresh_secret";

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

const USERS_CACHE_TTL = 60; // 1 minute
const PRODUCTS_CACHE_TTL = 600; // 10 minutes

// { id, name, passwordHash, role, blocked }
const users = [];

// { id, name, price, description }
const products = [];

const refreshTokens = new Set();

const generateAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      name: user.name,
      role: user.role,
    },
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN,
    },
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
    },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN,
    },
  );

const authMiddleware = (request, response, next) => {
  const header = request.headers.authorization;

  if (!header) {
    return response.status(401).json({ error: "missing authorization header" });
  }

  const [type, token] = header.split(" ", 2);

  if (type != "Bearer" || !token) {
    return response.status(401).json({ error: "invalid authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);

    const user = users.find((user) => user.id == payload.sub);

    if (!user || user.blocked) {
      return response.status(401).json({ error: "user not found or blocked" });
    }

    request.user = user;

    next();
  } catch (_) {
    return response.status(401).json({ error: "invalid access token" });
  }
};

const roleMiddleware = (roles) => (request, response, next) => {
  const user = request.user;

  if (!user || !roles.includes(user.role)) {
    return response.status(403).json({ error: "forbidden" });
  }

  next();
};

const cacheMiddleware =
  (keyFromRequest, ttl) => async (request, response, next) => {
    try {
      const key = keyFromRequest(request);

      const cached = await redisClient.get(key);

      if (cached) {
        return response.json({
          source: "cache",
          data: JSON.parse(cached),
        });
      }

      request.cacheKey = key;
      request.cacheTTL = ttl;

      next();
    } catch (error) {
      console.error(`cache read error: ${error}`);
      next();
    }
  };

const writeCache = async (key, data, ttl) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error(`cache write error: ${error}`);
  }
};

const clearUsers = async (userId = null) => {
  try {
    await redisClient.del("users:all");

    if (userId) {
      await redisClient.del(`users:${userId}`);
    }
  } catch (error) {
    console.error(`users clear error: ${error}`);
  }
};

const clearProducts = async (productId = null) => {
  try {
    await redisClient.del("products:all");

    if (productId) {
      await redisClient.del(`products:${productId}`);
    }
  } catch (error) {
    console.error(`products clear error: ${error}`);
  }
};

app.post("/api/auth/register", async (request, response) => {
  const { name, password, role } = request.body;

  if (!name || !password) {
    return response
      .status(400)
      .json({ error: "name and password are required" });
  }

  const exists = users.some((user) => user.name == name);

  if (exists) {
    return response
      .status(409)
      .json({ error: "user with this name already exists" });
  }

  const passwordHash = await argon2.hash(password);

  const user = {
    id: String(users.length + 1),
    name,
    passwordHash,
    role: role || "user",
    blocked: false,
  };

  users.push(user);

  response.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
    blocked: user.blocked,
  });
});

app.post("/api/auth/login", async (request, response) => {
  const { name, password } = request.body;

  if (!name || !password) {
    return response
      .status(400)
      .json({ error: "name and password are required" });
  }

  const user = users.find((user) => user.name == name);

  if (!user || user.blocked) {
    return response
      .status(401)
      .json({ error: "invalid credentials or user is blocked" });
  }

  const valid = await argon2.verify(user.passwordHash, password);

  if (!valid) {
    return response.status(401).json({ error: "invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  refreshTokens.add(refreshToken);

  response.json({
    accessToken,
    refreshToken,
  });
});

app.post("/api/auth/refresh", (request, response) => {
  const { refreshToken } = request.body;

  if (!refreshToken) {
    return response.status(400).json({ error: "refresh token is required" });
  }

  if (!refreshTokens.has(refreshToken)) {
    return response.status(401).json({ error: "invalid refresh token" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);

    const user = users.find((user) => user.id == payload.sub);

    if (!user || user.blocked) {
      return response.status(401).json({ error: "user not found or blocked" });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    refreshTokens.add(newRefreshToken);

    response.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (_) {
    return response.status(401).json({ error: "invalid refresh token" });
  }
});

app.get(
  "/api/auth/me",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  (request, response) => {
    const user = request.user;

    response.json({
      id: user.id,
      name: user.name,
      role: user.role,
      blocked: user.blocked,
    });
  },
);

app.get(
  "/api/users",
  authMiddleware,
  roleMiddleware(["admin"]),
  cacheMiddleware((_request) => "users:all", USERS_CACHE_TTL),
  async (request, response) => {
    const data = users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      blocked: user.blocked,
    }));

    await writeCache(request.cacheKey, data, request.cacheTTL);

    response.status(200).json({
      source: "server",
      data,
    });
  },
);

app.get(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  cacheMiddleware((request) => `users:${request.params.id}`, USERS_CACHE_TTL),
  async (request, response) => {
    const { id } = request.params;

    const user = users.find((user) => user.id == id);

    if (!user) {
      return response.status(404).json({ error: "user not found" });
    }

    const data = {
      id: user.id,
      name: user.name,
      role: user.role,
      blocked: user.blocked,
    };

    await writeCache(request.cacheKey, data, request.cacheTTL);

    response.status(200).json({
      source: "server",
      data,
    });
  },
);

app.put(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (request, response) => {
    const { id } = request.params;
    const { name, role, blocked } = request.body;

    const user = users.find((user) => user.id == id);

    if (!user) {
      return response.status(404).json({ error: "user not found" });
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (blocked !== undefined) {
      user.blocked = blocked;
    }

    await clearUsers(user.id);

    response.status(200).json({
      id: user.id,
      name: user.name,
      role: user.role,
      blocked: user.blocked,
    });
  },
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (request, response) => {
    const { id } = request.params;

    const user = users.find((user) => user.id == id);

    if (!user) {
      return response.status(404).json({ error: "user not found" });
    }

    user.blocked = true;

    await clearUsers(user.id);

    response.status(200).json({ message: "user blocked", id: user.id });
  },
);

app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  async (request, response) => {
    const { name, price, description } = request.body;

    if (!name || !price || !description) {
      return response
        .status(400)
        .json({ error: "name, price and description are all required" });
    }

    const product = {
      id: String(products.length + 1),
      name,
      price,
      description,
    };

    products.push(product);

    await clearProducts();

    response.status(201).json(product);
  },
);

app.get(
  "/api/products",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  cacheMiddleware((_request) => "products:all", PRODUCTS_CACHE_TTL),
  async (request, response) => {
    const data = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
    }));

    await writeCache(request.cacheKey, data, request.cacheTTL);

    response.status(200).json({ source: "server", data });
  },
);

app.get(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["user", "seller", "admin"]),
  cacheMiddleware(
    (request) => `products:${request.params.id}`,
    PRODUCTS_CACHE_TTL,
  ),
  async (request, response) => {
    const { id } = request.params;

    const product = products.find((product) => product.id == id);

    if (!product) {
      return response.status(404).json({ error: "product not found" });
    }

    const data = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
    };

    await writeCache(request.cacheKey, data, request.cacheTTL);

    response.status(200).json({ source: "server", data });
  },
);

app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  async (request, response) => {
    const { id } = request.params;
    const { name, price, description } = request.body;

    const product = products.find((product) => product.id == id);

    if (!product) {
      return response.status(404).json({ error: "product not found" });
    }

    if (name !== undefined) {
      product.name = name;
    }

    if (price !== undefined) {
      product.price = price;
    }

    if (description !== undefined) {
      product.description = description;
    }

    await clearProducts(product.id);

    response.status(200).json(product);
  },
);

app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (request, response) => {
    const { id } = request.params;

    const index = products.findIndex((product) => product.id == id);

    if (index == -1) {
      return response.status(404).json({ error: "product not found" });
    }

    products.splice(index, 1);

    await clearProducts(id);

    response.status(200).json({ message: "product deleted", id });
  },
);

initRedis().then(() => {
  app.listen(PORT, () => {
    console.log(`server running on http://127.0.0.1:${PORT}`);
  });
});
