const APP = "app";
const CONTENT = "content";

const HOME = "home";
const ABOUT = "about";
const BUTTON = "button";

const ACTIVE = "active";

const HOME_BUTTON = `${HOME}-${BUTTON}`;
const ABOUT_BUTTON = `${ABOUT}-${BUTTON}`;

const ACTIVE_BUTTON = `${ACTIVE}-${BUTTON}`;

const app = document.getElementById(APP);
const homeButton = document.getElementById(HOME_BUTTON);
const aboutButton = document.getElementById(ABOUT_BUTTON);

const buttons = [homeButton, aboutButton];

const socket = io("http://localhost:3001");

const KEY =
  "BJwQQ6EZjYdooernFqIsTPQ7I6mwveEeHSlwi1PvEXI30dcC6-0pOZTanzryx_T2ifrZUwqkjYziWCJb3aTJmWc";
const ALPHABET = "base64url";

const KEY_ARRAY = Uint8Array.fromBase64(KEY, { alphabet: ALPHABET });

const setActiveButton = (id) => {
  buttons.forEach((button) => button.classList.remove(ACTIVE_BUTTON));
  document.getElementById(id).classList.add(ACTIVE_BUTTON);
};

const SERVICE_WORKER = "serviceWorker";
const PUSH_MANAGER = "PushManager";

const subscribeToPush = async () => {
  if (!(SERVICE_WORKER in navigator && PUSH_MANAGER in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: KEY_ARRAY,
    });

    await fetch("http://localhost:3001/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });

    console.log("subscribed");
  } catch (error) {
    console.error(`error subscribing: ${error}`);
  }
};

const unsubscribeFromPush = async () => {
  if (!(SERVICE_WORKER in navigator && PUSH_MANAGER in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await fetch("http://localhost:3001/unsubscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();

    console.log("unsubscribed");
  }
};

const loadContent = async (name) => {
  try {
    const response = await fetch(`/${CONTENT}/${name}.html`);
    const html = await response.text();

    app.innerHTML = html;

    if (name == HOME) {
      initNotes();
    }
  } catch (error) {
    app.innerHTML = `<p class="text-red-700">Ошибка загрузки страницы.</p>`;

    console.error(error);
  }
};

const CLICK = "click";

homeButton.addEventListener(CLICK, () => {
  setActiveButton(HOME_BUTTON);
  loadContent(HOME);
});

aboutButton.addEventListener(CLICK, () => {
  setActiveButton(ABOUT_BUTTON);
  loadContent(ABOUT);
});

const initNotes = () => {
  const EMPTY = "";

  const NOTES = "notes";

  const LIST_ID = "note-list";
  const FORM_ID = "note-form";
  const INPUT_ID = "note-input";

  const list = document.getElementById(LIST_ID);
  const form = document.getElementById(FORM_ID);
  const input = document.getElementById(INPUT_ID);

  const getNotes = () => {
    const option = localStorage.getItem(NOTES);

    return option ? JSON.parse(option) : [];
  };

  const setNotes = (notes) =>
    localStorage.setItem(NOTES, JSON.stringify(notes));

  const wrapNote = (note) => `<li class="p-2 mb-2">${note.text}</li>`;

  const loadNotes = () => {
    const notes = getNotes();

    list.innerHTML = notes.map(wrapNote).join(EMPTY);
  };

  const addNote = (text) => {
    const notes = getNotes();

    const timestamp = Date.now();

    const note = { text, timestamp };

    notes.push(note);

    setNotes(notes);

    loadNotes();

    socket.emit("newTask", { text, timestamp });
  };

  const SUBMIT = "submit";

  form.addEventListener(SUBMIT, (event) => {
    event.preventDefault();

    const note = input.value.trim();

    if (note) {
      addNote(note);

      input.value = EMPTY;
    }
  });

  loadNotes();
};

loadContent(HOME);

const LOAD = "load";

const WORKER = "./sw.js";

socket.on("taskAdded", (task) => {
  console.log(`task added: ${task}`);

  const notification = document.createElement("div");

  notification.textContent = `Новая задача: ${task.text}`;
  notification.style.cssText = `
    position: fixed;
    top: 0.5rem;
    right: 0.5rem;
    background: #cc55ff;
    color: #101010;
    padding: 1rem;
    border-radius: 0.5rem;
    z-index: 1000;
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
});

if (SERVICE_WORKER in navigator) {
  window.addEventListener(LOAD, async () => {
    try {
      const registration = await navigator.serviceWorker.register(WORKER);

      console.log(`service worker registered: ${registration.scope}`);

      const enableButton = document.getElementById("enable-push");
      const disableButton = document.getElementById("disable-push");

      if (enableButton && disableButton) {
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          enableButton.style.display = "none";
          disableButton.style.display = "inline-block";
        }

        enableButton.addEventListener(CLICK, async () => {
          if (Notification.permission == "denied") {
            alert("Уведомления запрещены. Разрешите их в настройках браузера.");

            return;
          }

          if (Notification.permission == "default") {
            const permission = Notification.requestPermission();

            if (permission != "granted") {
              alert("Необходимо разрешить уведомления.");

              return;
            }
          }

          await subscribeToPush();

          enableButton.style.display = "none";
          disableButton.style.display = "inline-block";
        });

        disableButton.addEventListener(CLICK, async () => {
          await unsubscribeFromPush();

          disableButton.style.display = "none";
          enableButton.style.display = "inline-block";
        });
      }
    } catch (error) {
      console.error(`error registering service worker: ${error}`);
    }
  });
}
