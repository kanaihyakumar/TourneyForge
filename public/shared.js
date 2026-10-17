/* TourneyForge - shared data layer, auth, timezone utils (Firestore-backed).
   All tournament/organizer/admin data now lives in Firestore so it is shared
   across every device & browser. Only per-browser UI preferences (current
   login session, "my registrations", display timezone) stay in localStorage. */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

var app = initializeApp(firebaseConfig);
var db = getFirestore(app);

var SESSION_KEY = "tf_session_v1";
var MY_REGS_KEY = "tf_my_registrations_v1";

// ---------- Timezones ----------
var TIMEZONES = [
  { id: "Asia/Kolkata", label: "IST - India" },
  { id: "America/New_York", label: "ET - US Eastern" },
  { id: "America/Chicago", label: "CT - US Central" },
  { id: "America/Denver", label: "MT - US Mountain" },
  { id: "America/Los_Angeles", label: "PT - US Pacific" },
  { id: "Europe/London", label: "GMT/BST - UK" },
  { id: "Europe/Berlin", label: "CET - Central Europe" },
  { id: "Asia/Dubai", label: "GST - Dubai" },
  { id: "Asia/Singapore", label: "SGT - Singapore" },
  { id: "Asia/Tokyo", label: "JST - Japan" },
  { id: "Australia/Sydney", label: "AEST - Sydney" },
  { id: "UTC", label: "UTC" }
];

function zonedTimeToUtc(y, mo, d, hh, mm, timeZone) {
  var asUTC = Date.UTC(y, mo - 1, d, hh, mm, 0);
  function offsetAt(ms) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var parts = dtf.formatToParts(new Date(ms));
    var map = {};
    parts.forEach(function (p) { map[p.type] = p.value; });
    var hour = map.hour === "24" ? 0 : parseInt(map.hour, 10);
    var asIfUTC = Date.UTC(parseInt(map.year, 10), parseInt(map.month, 10) - 1,
      parseInt(map.day, 10), hour, parseInt(map.minute, 10), parseInt(map.second, 10));
    return asIfUTC - ms;
  }
  var offset = offsetAt(asUTC);
  var utc = asUTC - offset;
  var offset2 = offsetAt(utc);
  if (offset2 !== offset) utc = asUTC - offset2;
  return utc;
}

function formatInTZ(utcMillis, timeZone) {
  if (!utcMillis) return "";
  try {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone, weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
    return dtf.format(new Date(utcMillis));
  } catch (e) {
    return new Date(utcMillis).toString();
  }
}

function tzLabel(id) {
  var tz = TIMEZONES.filter(function (t) { return t.id === id; })[0];
  return tz ? tz.label.split(" - ")[0] : id;
}

// Normalizes any raw name/handle into a Plato ID with exactly one leading "@",
// regardless of how many "@" characters (if any) were typed/stored originally.
// Also understands 2v2 "team labels" joined with " & " (e.g. "Alice & @Bob")
// and formats each half independently so a combined team still shows exactly
// one "@" per teammate, e.g. "@Alice & @Bob".
function formatPlatoId(raw) {
  var str = String(raw == null ? "" : raw).trim();
  if (str.indexOf(" & ") !== -1) {
    return str.split(" & ").map(formatPlatoId).join(" & ");
  }
  var clean = str.replace(/@/g, "");
  return clean ? "@" + clean : "";
}

// Builds the raw (unformatted) combined label used to represent a 2v2 team as
// a single bracket "member" - e.g. registerParticipant's {platoId, partnerPlatoId}
// becomes one "Alice & Bob" unit so Match Bracket pairs teams against teams.
function teamLabel(platoId, partnerPlatoId) {
  var a = String(platoId || "").trim();
  var b = String(partnerPlatoId || "").trim();
  return b ? (a + " & " + b) : a;
}

// ---------- Session (stays per-browser; not shared data) ----------
function getSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function setSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}

// ---------- Auth (simple username/password check against Firestore) ----------
async function login(username, password) {
  username = (username || "").trim().toLowerCase();

  var adminSnap = await getDoc(doc(db, "config", "admin"));
  if (adminSnap.exists()) {
    var admin = adminSnap.data();
    if ((admin.username || "").toLowerCase() === username && admin.password === password) {
      var adminSession = { role: "admin", id: "admin", displayName: admin.displayName || "Admin" };
      setSession(adminSession);
      return adminSession;
    }
  }

  var q = query(collection(db, "organizers"), where("usernameLower", "==", username));
  var snap = await getDocs(q);
  var match = snap.docs.filter(function (d) { return d.data().password === password; })[0];
  if (match) {
    var orgSession = {
      role: "organizer",
      id: match.id,
      displayName: match.data().displayName,
      canManageOrganizers: !!match.data().canManageOrganizers
    };
    setSession(orgSession);
    return orgSession;
  }
  return null;
}
function logout() { clearSession(); }

// ---------- Organizers (admin only, unless canManageOrganizers is granted) ----------
async function listOrganizers() {
  var snap = await getDocs(collection(db, "organizers"));
  return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
}

async function createOrganizer(data) {
  var payload = {
    username: data.username.trim(),
    usernameLower: data.username.trim().toLowerCase(),
    password: data.password,
    displayName: data.displayName.trim(),
    canManageOrganizers: !!data.canManageOrganizers,
    createdAt: Date.now()
  };
  var ref = await addDoc(collection(db, "organizers"), payload);
  return Object.assign({ id: ref.id }, payload);
}

async function updateOrganizer(id, data) {
  var ref = doc(db, "organizers", id);
  var snap = await getDoc(ref);
  if (!snap.exists()) return null;
  var updates = {};
  if (data.username) {
    updates.username = data.username.trim();
    updates.usernameLower = data.username.trim().toLowerCase();
  }
  if (data.displayName) {
    updates.displayName = data.displayName.trim();
  }
  if (data.canManageOrganizers !== undefined) {
    updates.canManageOrganizers = !!data.canManageOrganizers;
  }
  await updateDoc(ref, updates);

  // Keep each tournament's stored organizerName in sync with the live organizer record.
  if (updates.displayName) {
    var tq = query(collection(db, "tournaments"), where("organizerId", "==", id));
    var tsnap = await getDocs(tq);
    await Promise.all(tsnap.docs.map(function (d) {
      return updateDoc(doc(db, "tournaments", d.id), { organizerName: updates.displayName });
    }));
  }
  return Object.assign({ id: id }, snap.data(), updates);
}

async function resetOrganizerPassword(id, newPassword) {
  await updateDoc(doc(db, "organizers", id), { password: newPassword });
  return true;
}

async function deleteOrganizer(id) {
  await deleteDoc(doc(db, "organizers", id));
  // Tournaments created by a removed organizer stay, but become admin-managed.
  var tq = query(collection(db, "tournaments"), where("organizerId", "==", id));
  var tsnap = await getDocs(tq);
  await Promise.all(tsnap.docs.map(function (d) {
    return updateDoc(doc(db, "tournaments", d.id), { organizerId: "admin" });
  }));
}

// ---------- Tournaments ----------
function computeStatus(t) {
  if (t.cancelled) return "cancelled";
  if (t.completed) return "completed"; // manual override, e.g. wrapped up early or ran long
  var now = Date.now();
  var ONGOING_WINDOW = 4 * 3600 * 1000; // assume a tournament runs ~4h
  if (now < t.startUTC) return "upcoming";
  if (now < t.startUTC + ONGOING_WINDOW) return "ongoing";
  return "completed";
}

function withMeta(id, data) {
  var copy = Object.assign({ id: id }, data);
  copy.status = computeStatus(data);
  copy.registrations = data.registrations || [];
  copy.registeredCount = copy.registrations.length;
  copy.hosts = data.hosts || [];
  copy.managerIds = data.managerIds || [];
  copy.winners = data.winners || [];
  copy.closingMessage = data.closingMessage || "";
  copy.completed = !!data.completed;
  copy.cancelled = !!data.cancelled;
  copy.teamSize = data.teamSize === 2 ? 2 : 1;
  // "slots" is always the total player count. For a 2v2 tournament each
  // registration is a team of 2, so the number of teams we can accept is
  // half the player slots (e.g. 32 player slots = 16 teams).
  copy.teamCapacity = copy.teamSize === 2 ? Math.floor((data.slots || 0) / 2) : (data.slots || 0);
  return copy;
}

async function listTournaments() {
  var snap = await getDocs(collection(db, "tournaments"));
  var all = snap.docs.map(function (d) { return withMeta(d.id, d.data()); });
  return all.sort(function (a, b) {
    var rank = { ongoing: 0, upcoming: 1, completed: 2, cancelled: 3 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return a.startUTC - b.startUTC;
  });
}

async function getTournament(id) {
  var snap = await getDoc(doc(db, "tournaments", id));
  return snap.exists() ? withMeta(snap.id, snap.data()) : null;
}

function canManage(session, tournament) {
  if (!session || !tournament) return false;
  if (session.role === "admin") return true;
  if (session.role !== "organizer") return false;
  if (tournament.organizerId === session.id) return true;
  return (tournament.managerIds || []).indexOf(session.id) !== -1;
}

async function createTournament(data, session) {
  if (!session || (session.role !== "admin" && session.role !== "organizer")) return null;
  var payload = {
    title: data.title.trim(),
    game: data.game.trim(),
    slots: parseInt(data.slots, 10) || 0,
    announcement: data.announcement || "",
    details: data.details || "",
    prizeText: data.prizeText || "",
    hosts: Array.isArray(data.hosts) ? data.hosts.filter(Boolean) : [],
    sponsor: (data.sponsor || "").trim(),
    closingMessage: (data.closingMessage || "").trim(),
    winners: Array.isArray(data.winners) ? data.winners.filter(function (w) { return w && w.name; }) : [],
    // Team format: 1 = 1v1 (solo), 2 = 2v2 (duos, e.g. Soccer). Participants
    // registering for a teamSize-2 tournament also submit a partner Plato ID.
    teamSize: parseInt(data.teamSize, 10) === 2 ? 2 : 1,
    startUTC: data.startUTC,
    createdTZ: data.createdTZ,
    organizerId: session.id,
    organizerName: session.displayName,
    // Only admins can grant extra organizers management access at creation time.
    managerIds: (session.role === "admin" && Array.isArray(data.managerIds)) ? data.managerIds.filter(Boolean) : [],
    registrations: [],
    cancelled: false,
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  var ref = await addDoc(collection(db, "tournaments"), payload);
  return withMeta(ref.id, payload);
}

async function updateTournament(id, data, session) {
  var ref = doc(db, "tournaments", id);
  var snap = await getDoc(ref);
  if (!snap.exists()) return null;
  var existing = snap.data();
  if (!canManage(session, existing)) return null;

  var updates = {};
  ["title", "game", "announcement", "details", "prizeText", "sponsor", "closingMessage", "startUTC", "createdTZ", "cancelled", "completed"].forEach(function (k) {
    if (data[k] !== undefined) updates[k] = data[k];
  });
  if (data.hosts !== undefined) updates.hosts = Array.isArray(data.hosts) ? data.hosts.filter(Boolean) : [];
  if (data.winners !== undefined) {
    updates.winners = Array.isArray(data.winners) ? data.winners.filter(function (w) { return w && w.name; }) : [];
  }
  if (data.teamSize !== undefined) {
    updates.teamSize = parseInt(data.teamSize, 10) === 2 ? 2 : 1;
  }
  if (data.slots !== undefined) updates.slots = parseInt(data.slots, 10) || 0;
  // Only an admin may grant/revoke other organizers' management access.
  if (session.role === "admin" && data.managerIds !== undefined) {
    updates.managerIds = Array.isArray(data.managerIds) ? data.managerIds.filter(Boolean) : [];
  }
  updates.updatedAt = Date.now();

  await updateDoc(ref, updates);
  return withMeta(id, Object.assign({}, existing, updates));
}

async function deleteTournament(id, session) {
  var ref = doc(db, "tournaments", id);
  var snap = await getDoc(ref);
  if (!snap.exists() || !canManage(session, snap.data())) return false;
  await deleteDoc(ref);
  return true;
}

// ---------- Forge state (generated groups / match bracket) persisted per tournament ----------
async function getForgeState(tournamentId) {
  var snap = await getDoc(doc(db, "tournaments", tournamentId));
  if (!snap.exists()) return null;
  return snap.data().forgeState || null;
}

async function saveForgeState(tournamentId, state, session) {
  if (!tournamentId) return false;
  var ref = doc(db, "tournaments", tournamentId);
  var snap = await getDoc(ref);
  if (!snap.exists() || !canManage(session, snap.data())) return false;
  // Defensive scrub: Firestore rejects `undefined` anywhere in the payload, and a
  // stray undefined deep in groups/bracket data would otherwise make the whole
  // save silently throw. JSON round-tripping drops undefined keys safely.
  var safeState = JSON.parse(JSON.stringify(state));
  await updateDoc(ref, { forgeState: safeState, forgeStateUpdatedAt: Date.now() });
  return true;
}

// Reads the podium (1st-4th place names) out of a saved Match Bracket state
// (the shape produced by forge.html's serializeState().bracket). Returns null
// if the bracket hasn't produced a final winner yet.
function extractPodiumFromBracketState(bracketState) {
  if (!bracketState || !Array.isArray(bracketState.stages)) return null;
  var stages = bracketState.stages;
  var finalStage = stages.filter(function (s) { return !s.isThirdPlace && s.matches.length === 1; }).pop();
  var thirdStage = stages.filter(function (s) { return s.isThirdPlace; })[0];
  var result = { champion: null, runnerUp: null, thirdPlace: null, fourthPlace: null };

  if (finalStage && finalStage.matches[0] && finalStage.matches[0].winnerName) {
    var fm = finalStage.matches[0];
    result.champion = fm.winnerName;
    result.runnerUp = fm.winnerName === fm.p1Name ? fm.p2Name : fm.p1Name;
  }
  if (thirdStage && thirdStage.matches[0] && thirdStage.matches[0].winnerName) {
    var tm = thirdStage.matches[0];
    result.thirdPlace = tm.winnerName;
    result.fourthPlace = tm.winnerName === tm.p1Name ? tm.p2Name : tm.p1Name;
  }
  return result.champion ? result : null;
}

// Normalizes a Plato ID purely for equality comparisons (strip "@", trim,
// lowercase) - never used for storage/display, only to decide "is this the
// same ID" regardless of whether either side happened to include an "@".
function normalizeForCompare(raw) {
  return String(raw || "").trim().replace(/@/g, "").toLowerCase();
}

async function registerParticipant(id, platoId, partnerPlatoId) {
  var ref = doc(db, "tournaments", id);
  var snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, message: "Tournament not found." };
  var t = snap.data();
  var registrations = t.registrations || [];
  var isTeam = t.teamSize === 2;
  // "slots" is total players; a 2v2 tournament accepts half as many team
  // registrations (e.g. 32 player slots = 16 team registrations).
  var capacity = isTeam ? Math.floor((t.slots || 0) / 2) : (t.slots || 0);

  if (capacity && registrations.length >= capacity) {
    return { ok: false, message: isTeam ? "All team slots are full for this tournament." : "All slots are full for this tournament." };
  }
  var clean = (platoId || "").trim();
  if (!clean) return { ok: false, message: "Please enter your Plato ID." };
  var cleanCmp = normalizeForCompare(clean);

  var cleanPartner = "";
  var partnerCmp = "";
  if (t.teamSize === 2) {
    cleanPartner = (partnerPlatoId || "").trim();
    if (!cleanPartner) return { ok: false, message: "This is a 2v2 tournament - please enter your partner's Plato ID too." };
    partnerCmp = normalizeForCompare(cleanPartner);
    if (!partnerCmp || partnerCmp === cleanCmp) {
      return { ok: false, message: "Your Plato ID and your partner's Plato ID can't be the same." };
    }
  }

  var dup = registrations.some(function (r) {
    var rPlatoCmp = normalizeForCompare(r.platoId);
    var rPartnerCmp = normalizeForCompare(r.partnerPlatoId);
    return rPlatoCmp === cleanCmp ||
      (partnerCmp && rPlatoCmp === partnerCmp) ||
      (rPartnerCmp && rPartnerCmp === cleanCmp) ||
      (partnerCmp && rPartnerCmp && rPartnerCmp === partnerCmp);
  });
  if (dup) return { ok: false, message: "That Plato ID (or your partner's) is already registered." };

  var entry = { platoId: clean, registeredAt: Date.now() };
  if (cleanPartner) entry.partnerPlatoId = cleanPartner;
  var updated = registrations.concat([entry]);
  await updateDoc(ref, { registrations: updated });
  rememberMyRegistration(id);
  return { ok: true, message: "You're in! Good luck in the arena." };
}

function rememberMyRegistration(tournamentId) {
  var list = getMyRegistrations();
  if (list.indexOf(tournamentId) === -1) list.push(tournamentId);
  try { localStorage.setItem(MY_REGS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}
function getMyRegistrations() {
  try {
    var raw = localStorage.getItem(MY_REGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export var TF = {
  TIMEZONES: TIMEZONES,
  zonedTimeToUtc: zonedTimeToUtc,
  formatInTZ: formatInTZ,
  tzLabel: tzLabel,
  formatPlatoId: formatPlatoId,
  teamLabel: teamLabel,
  getSession: getSession,
  login: login,
  logout: logout,
  listOrganizers: listOrganizers,
  createOrganizer: createOrganizer,
  updateOrganizer: updateOrganizer,
  resetOrganizerPassword: resetOrganizerPassword,
  deleteOrganizer: deleteOrganizer,
  listTournaments: listTournaments,
  getTournament: getTournament,
  createTournament: createTournament,
  updateTournament: updateTournament,
  deleteTournament: deleteTournament,
  registerParticipant: registerParticipant,
  getMyRegistrations: getMyRegistrations,
  getForgeState: getForgeState,
  saveForgeState: saveForgeState,
  extractPodiumFromBracketState: extractPodiumFromBracketState,
  canManage: canManage,
  computeStatus: computeStatus
};
