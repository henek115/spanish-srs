import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let status = "signed-out"; // signed-out | syncing | synced | error
let lastError = null;
let statusListeners = [];
let lastKnownCloudUpdatedAt = null;
let pushTimer = null;

function setStatus(s, err) {
  status = s;
  lastError = err || null;
  notify();
}
function notify() {
  for (const fn of statusListeners) {
    try {
      fn();
    } catch (e) {
      console.warn("слушатель AppSync.onChange упал", e);
    }
  }
}

function userDocRef(uid) {
  return doc(db, "users", uid);
}

async function initialSync(user) {
  if (!window.__store) {
    console.warn("window.__store не найден - app.js ещё не загрузился?");
    return;
  }
  setStatus("syncing");
  const localState = window.__store.exportState();
  try {
    const snap = await getDoc(userDocRef(user.uid));
    if (snap.exists()) {
      const cloudState = snap.data();
      if ((cloudState.updatedAt || 0) > (localState.updatedAt || 0)) {
        window.__store.importState(cloudState);
        lastKnownCloudUpdatedAt = cloudState.updatedAt || 0;
      } else {
        await setDoc(userDocRef(user.uid), localState);
        lastKnownCloudUpdatedAt = localState.updatedAt || 0;
      }
    } else {
      await setDoc(userDocRef(user.uid), localState);
      lastKnownCloudUpdatedAt = localState.updatedAt || 0;
    }
    setStatus("synced");
  } catch (e) {
    console.warn("ошибка первичной синхронизации", e);
    setStatus("error", e.message || String(e));
  }
}

async function pushNow() {
  const user = auth.currentUser;
  if (!user || !window.__store) return;
  const localState = window.__store.exportState();
  if ((localState.updatedAt || 0) <= (lastKnownCloudUpdatedAt || 0)) return; 
  setStatus("syncing");
  try {
    await setDoc(userDocRef(user.uid), localState);
    lastKnownCloudUpdatedAt = localState.updatedAt || 0;
    setStatus("synced");
  } catch (e) {
    console.warn("ошибка отправки прогресса в облако", e);
    setStatus("error", e.message || String(e));
  }
}

function schedulePush() {
  if (!auth.currentUser) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, 2000);
}

function wireStoreListener() {
  if (window.__store) {
    window.__store.onStateChange(schedulePush);
  } else {
    setTimeout(wireStoreListener, 50);
  }
}
wireStoreListener();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && auth.currentUser) {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    pushNow();
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    initialSync(user);
  } else {
    lastKnownCloudUpdatedAt = null;
    setStatus("signed-out");
  }
});

getRedirectResult(auth).catch((e) => {
  console.warn("ошибка входа через Google", e);
  setStatus("error", e.message || String(e));
});

window.AppSync = {
  signInWithGoogle() {
    return signInWithRedirect(auth, new GoogleAuthProvider());
  },
  signOut() {
    return fbSignOut(auth);
  },
  getUser() {
    const u = auth.currentUser;
    if (!u) return null;
    return { uid: u.uid, name: u.displayName || "", email: u.email || "", photo: u.photoURL || "" };
  },
  getStatus() {
    return status;
  },
  getLastError() {
    return lastError;
  },
  onChange(fn) {
    statusListeners.push(fn);
    return () => {
      statusListeners = statusListeners.filter((f) => f !== fn);
    };
  },
};
