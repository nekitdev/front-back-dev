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

const setNotes = (notes) => localStorage.setItem(NOTES, JSON.stringify(notes));

const wrapNote = (note) => `<li>${note}</li>`;

const loadNotes = () => {
  const notes = getNotes();

  list.innerHTML = notes.map(wrapNote).join(EMPTY);
};

const addNote = (note) => {
  const notes = getNotes();

  notes.push(note);

  setNotes(notes);

  loadNotes();
};

const SUBMIT = "submit";
const LOAD = "load";

form.addEventListener(SUBMIT, (event) => {
  event.preventDefault();

  const note = input.value.trim();

  if (note) {
    addNote(note);

    input.value = EMPTY;
  }
});

loadNotes();

const SERVICE_WORKER = "serviceWorker";

const WORKER = "./sw.js";

if (SERVICE_WORKER in navigator) {
  window.addEventListener(LOAD, async () => {
    try {
      const registration = await navigator.serviceWorker.register(WORKER);

      console.log(`service worker registered: ${registration.scope}`);
    } catch (error) {
      console.error(`error registering service worker: ${error}`);
    }
  });
}
