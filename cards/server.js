const express = require("express");
const next = require("next");
const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const SESSION_SECRET = process.env.SESSION_SECRET || "hi_test_0";

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), "data");
  const usersFile = path.join(dataDir, "users.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({}));
  }
};

// Helper function to read user data
const getUsers = () => {
  const usersFile = path.join(process.cwd(), "data", "users.json");
  try {
    return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch (error) {
    return {};
  }
};

const getInventory = (userId) => {
  const usersFile = path.join(process.cwd(), "data", "inventory", `${userId}.json`);
  try {
    return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch (error) {
    return {};
  }
};

// Helper function to save user data
const saveUsers = (users) => {
  const usersFile = path.join(process.cwd(), "data", "users.json");
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

// Helper function to save user data
const saveInventory = (userId, data) => {
  const usersFile = path.join(process.cwd(), "data", "inventory", userId + ".json");
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
};

// Helper function to get or create user
const getOrCreateUser = (userId) => {
  const users = getUsers();
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      pokeCoins: 5000, // Default starting coins
      lastCoinClaim: new Date().toISOString(),
      lastWonderPick: new Date().toISOString(),
    };
    saveUsers(users);
  }
  return users[userId];
};

const getOrCreateUserInventory = (userId) => {
  // Create inventory directory if it doesn't exist
  const inventoryDir = path.join(process.cwd(), "data", "inventory");
  if (!fs.existsSync(inventoryDir)) {
    fs.mkdirSync(inventoryDir, { recursive: true });
  }

  const inventoryFile = path.join(inventoryDir, `${userId}.json`);
  let inventory;

  try {
    // Try to read existing inventory
    if (fs.existsSync(inventoryFile)) {
      inventory = JSON.parse(fs.readFileSync(inventoryFile, "utf-8"));
    } else {
      // Create new inventory if file doesn't exist
      inventory = [];
      fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
    }
  } catch (error) {
    console.error(`Error handling inventory for user ${userId}:`, error);
    // Create new inventory in case of error
    inventory = [];
    fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));
  }

  return inventory;
};

const fileReaderJson = (path) => {
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch (error) {
    fs.writeFileSync(path, JSON.stringify([], null, 2));
    return [];
  }
};

app.prepare().then(() => {
  const server = express();

  // Ensure data directory exists on startup
  ensureDataDir();

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use(cookieParser());

  server.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: true, // Changed to true to ensure session creation
      cookie: {
        httpOnly: true,
        secure: !dev,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // User data endpoint
  server.get("/api/user", (req, res) => {
    // If no session exists, create a new session
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const users = getUsers();
    const userData = users[req.session.userId];

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive information before sending
    const { password, ...safeUserData } = userData;
    res.json(safeUserData);
  });

  server.get("/api/inventory", (req, res) => {
    // If no session exists, create a new session
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userData = req.session.userId;
    const inventory = getOrCreateUserInventory(userData);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(inventory);
  });

  server.post("/api/auth", (req, res) => {
    const { email, password, mode } = req.body;
    const users = getUsers();

    try {
      if (mode === "signup") {
        // Check if user already exists
        if (Object.values(users).some((user) => user.email === email)) {
          return res.status(400).json({ message: "User already exists" });
        }

        // Create new user
        const userId = Math.random().toString(36).substr(2, 9);
        const newUser = {
          id: userId,
          email,
          password, // In production, hash the password!
          pokeCoins: 5000,
          lastCoinClaim: new Date().toISOString(),
          lastWonderPick: new Date().toISOString(),
        };

        getOrCreateUserInventory(userId);

        users[userId] = newUser;
        saveUsers(users);

        req.session.userId = userId;
        return res.json({
          message: "User created successfully",
          user: {
            id: newUser.id,
            email: newUser.email,
            pokeCoins: newUser.pokeCoins,
          },
        });
      } else {
        // Sign in
        const user = Object.values(users).find(
          (u) => u.email === email && u.password === password
        );

        if (!user) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        req.session.userId = user.id;
        return res.json({
          message: "Signed in successfully",
          user: {
            id: user.id,
            email: user.email,
            pokeCoins: user.pokeCoins,
          },
        });
      }
    } catch (error) {
      console.error("Authentication error:", error);
      res.status(500).json({ message: "Server error during authentication" });
    }
  });

  // Sets endpoint
  server.get("/v1/sets", (req, res) => {
    const sets = fileReaderJson("./API/sets/en.json");
    res.json(sets);
  });

  // Cards endpoint
  server.get("/v1/cards", (req, res) => {
    const cards = fileReaderJson(`./API/cards/${req.query.q}.json`);
    res.json(cards);
  });

  server.post("/api/open-pack", (req, res) => {
    const user = getOrCreateUser(req.session.userId);

    const sets = fileReaderJson("./API/sets/en.json");
    const setId = req.body.setId;
    const selectedSet = sets.find((set) => set.id === setId);
    const purch = setId == 'base1' ? 10000 : 500;

    if (!selectedSet) {
      return res.status(400).json({ error: "Set not found" });
    }

    if (user.pokeCoins < purch) {
      return res.status(400).json({ error: "Insufficient PokeCoins" });
    }

    user.pokeCoins -= purch;

    const cards = fileReaderJson(`./API/cards/${selectedSet.id}.json`);
    const pack = [];
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * cards.length);
      pack.push(cards[randomIndex]);
    }

    let inventory = getOrCreateUserInventory(req.session.userId);
    inventory = [...inventory, ...pack];
    saveUsers({ ...getUsers(), [req.session.userId]: user });
    saveInventory(req.session.userId, inventory);
    res.json(pack);
  });

  // Wonder pick endpoint
  server.post("/api/wonder-pick", (req, res) => {
    const user = getOrCreateUser(req.session.userId);
    const now = new Date();
    const lastPick = new Date(user.lastWonderPick);

    if (now - lastPick < 8 * 60 * 60 * 1000 && user.pokeCoins <= 3000) {
      return res.status(400).json({ error: "Wonder Pick not available" });
    }

    if (user.pokeCoins >= 3000) {
      user.pokeCoins -= 3000;
    } else {
      user.lastWonderPick = now.toISOString();
    }

    const wonderPickCards = [];
    const SelectedCard = [];
    const sets = fileReaderJson("./API/sets/en.json");

    for (let i = 0; i < 5; i++) {
      const randomSetIndex = Math.floor(Math.random() * sets.length);
      const randomSet = sets[randomSetIndex];
      const cards = fileReaderJson(`./API/cards/${randomSet.id}.json`);
      const randomIndex = Math.floor(Math.random() * cards.length);
      wonderPickCards.push(cards[randomIndex]);
    }

    SelectedCard.push(
      wonderPickCards[Math.floor(Math.random() * wonderPickCards.length)]
    );

    const RealData = {
      wonderPick: wonderPickCards,
      selectedCard: SelectedCard,
    };

    let inventory = getOrCreateUserInventory(req.session.userId);
    inventory = [...inventory, ...SelectedCard];
    saveInventory(req.session.userId, inventory);
    saveUsers({ ...getUsers(), [req.session.userId]: user });
    res.json(RealData);
  });

  // Sell card endpoint
  server.post("/api/sell-card", (req, res) => {
    const { cardId } = req.body;
    const user = getOrCreateUser(req.session.userId);

    let inventory = getOrCreateUserInventory(req.session.userId);

    const cardIndex = inventory.findIndex((card) => card.id === cardId);
    if (cardIndex === -1) {
      return res.status(404).json({ error: "Card not found" });
    }

    const card = inventory[cardIndex];
    const rarityValues = {
      Common: 2,
      Uncommon: 5,
      Rare: 30,
      "Rare Holo": 100,
      "Ultra Rare": 500,
      "Double Rare": 1500,
      "ACE SPEC Rare": 750,
      "Special Illustration Rare": 5000,
      "Hyper Rare": 3500,
      "Illustration Rare": 2500,
      "Shiny Rare": 1000,
      "Rare Rainbow": 3000,
      "No Rarity": 200,
      "Rare Holo EX": 800,
      Promo: 200,
      Gold: 20000
    };

    user.pokeCoins += card.id.split("-")[0] == "base1" ? rarityValues[card.rarity] * 1000 | 200 : rarityValues[card.rarity] || 0;

    inventory.splice(cardIndex, 1);
    saveInventory(req.session.userId, inventory);
    saveUsers({ ...getUsers(), [req.session.userId]: user });
    res.json({ success: true, pokeCoins: user.pokeCoins });
  });

  server.get("*", (req, res) => {
    return handle(req, res);
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> TCG Online ready on Port 3000!");
  });
});
