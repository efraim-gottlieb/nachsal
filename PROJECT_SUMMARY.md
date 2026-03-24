# נכס"ל — סקירת פרויקט מלאה

> **נכס"ל** — מערכת ניהול מוכנות חיילים בזמן אמת, כולל התרעות פיקוד העורף, ניהול אירועים, וסקרי מוכנות.

---

## 📦 מבנה כללי

```
nachsal/
├── package.json              # Root — תלויות כלליות (axios, node-fetch)
├── client/                   # React SPA (Vite)
└── server/                   # Node.js + Express API + Socket.io
```

**סטאק טכנולוגי:**
- **שרת:** Node.js (ES Modules), Express v5, MongoDB + Mongoose, JWT, bcrypt, Socket.io
- **לקוח:** React 18, React Router, react-leaflet (מפות), socket.io-client, Vite
- **SMS:** שליחת הודעות דרך API של 019
- **התרעות:** Polling מול API של פיקוד העורף (Oref)

---

## 🖥️ צד שרת (Server)

### נקודת כניסה — `app.js`
- הקמת Express + HTTP Server + Socket.io
- Middleware: CORS, JSON body parser
- חיבור MongoDB דרך Mongoose
- הפעלת Socket.io ו-Oref Polling
- הגשת build סטטי של React מ-`client/dist`
- Endpoint לדמו התרעת פיקוד העורף: `GET /demo-oref-alert`

### מודלים (Models)

| מודל | תיאור | שדות עיקריים |
|------|--------|--------------|
| **User** | משתמש (חייל/מפקד/אדמין) | `name`, `email`, `password`, `phone`, `user_type` (soldier/commander/admin), `city`, `lat`, `lng`, `commander_id` |
| **Event** | אירוע חירום | `cities` (רשימה), `status` (active/ended), `oref_alert` (בוליאני), `created_by`, `ended_at` |
| **SoldierStatus** | תגובת חייל לאירוע | `user_id`, `event_id`, `status` (pending/ok/not_ok/no_response), `responded_at` |
| **OrefAlert** | התרעת פיקוד העורף | `city`, `receivedAt` |

### נתיבים (Routes)

#### Auth — `/api/auth`
| Method | Path | Auth | תיאור |
|--------|------|------|--------|
| POST | `/register` | ❌ | הרשמת משתמש חדש |
| POST | `/login` | ❌ | התחברות |
| GET | `/me` | ✅ | קבלת פרטי משתמש מחובר |

#### Events — `/api/events`
| Method | Path | Auth | תיאור |
|--------|------|------|--------|
| POST | `/` | ✅ | יצירת אירוע (מפקד/אדמין) |
| GET | `/` | ✅ | כל האירועים |
| GET | `/active` | ✅ | אירועים פעילים בלבד |
| GET | `/:id` | ✅ | אירוע לפי ID |
| GET | `/:id/statuses` | ✅ | סטטוסים של חיילים באירוע |
| PUT | `/:id/end` | ✅ | סגירת אירוע |

#### Status — `/api/status`
| Method | Path | Auth | תיאור |
|--------|------|------|--------|
| POST | `/respond` | ✅ | תגובת חייל לאירוע |
| GET | `/pending` | ✅ | סקרים ממתינים לחייל |

#### Users — `/api/users`
| Method | Path | Auth | תיאור |
|--------|------|------|--------|
| PUT | `/location` | ✅ | עדכון מיקום משתמש |
| GET | `/soldiers` | ✅ | כל החיילים |
| GET | `/my-soldiers` | ✅ | חיילים של המפקד |
| GET | `/soldier-cities` | ✅ | ערים שיש בהן חיילים |
| GET | `/:id` | ✅ | חייל לפי ID |

### שירותים (Services)

| שירות | תיאור |
|-------|--------|
| **event.service** | יצירת אירועים, שליפה, סיום |
| **user.service** | ניהול משתמשים, שליפת חיילים לפי מפקד/עיר |
| **soldierStatus.service** | יצירת סטטוסים, עדכון תגובות, שליפה |
| **oref.service** | Polling מול API פיקוד העורף, שליחת התרעות בזמן אמת |
| **orefAlert.service** | שמירה/מחיקה של התרעות, שליפת התרעות אחרונות (15 דק׳) |
| **sms.service** | שליחת SMS דרך API של 019 |
| **socket.service** | ניהול חיבורי Socket.io — אימות, חדרים לפי תפקיד/עיר |

### Middleware
| שם | תיאור |
|----|--------|
| **auth.middleware** | אימות JWT, צירוף `user` ל-`req` |
| **asyncHandler** | עטיפת פונקציות async, העברת שגיאות ל-next |
| **errorHandling** | תפיסת שגיאות, לוגינג, החזרת JSON |

### Utils
| שם | תיאור |
|----|--------|
| **hash.js** | `encrypt(password)`, `compare(password, hashed)` — bcrypt |
| **token.js** | `generateToken(payload)`, `verifyToken(token)` — JWT |
| **HttpError.js** | מחלקת שגיאה מותאמת עם status ו-message |

### Seed (`seed.js`)
- יוצר 2 מפקדים (`eli@idf.il`, `dana@idf.il`) ו-10 חיילים
- סיסמה לכולם: `1234`
- חיילים מחולקים לערים שונות ומשויכים למפקדים

### Demo (`demo-oref.html`)
- דף HTML פשוט עם כפתור להפעלת דמו התרעת פיקוד העורף (ירושלים/תל אביב)

---

## 🌐 צד לקוח (Client)

### הגדרות
- **Vite** — פורט 5173, Proxy ל-`localhost:3000` (עבור `/api` ו-`/socket.io`)
- **כיוון:** RTL, עברית

### ניתוב (Routing)

| נתיב | עמוד | הרשאה |
|------|------|--------|
| `/` | Landing | פתוח |
| `/login` | Login | פתוח |
| `/commander` | CommanderDashboard | commander / admin |
| `/soldier` | SoldierPanel | soldier / commander / admin |

### עמודים (Pages)

#### Landing
- עמוד פתיחה עם שני כפתורים: כניסת מפקד / כניסת חייל

#### Login
- מצב התחברות / הרשמה (toggle)
- שדות: email, password, (בהרשמה: שם, טלפון, עיר)
- הפניה אוטומטית לדשבורד המתאים לפי תפקיד

#### CommanderDashboard
- **מפה:** הצגת חיילים על המפה (react-leaflet) עם מיקומים + עיגולי התרעה
- **אירועים:** יצירת אירוע חדש, צפייה באירועים פעילים, סגירת אירוע
- **סטטוסים:** מעקב תגובות חיילים (pending, ok, not_ok)
- **התרעות:** קבלת התרעות Oref בזמן אמת דרך Socket
- **הודעות Toast:** התראות ויזואליות

#### SoldierPanel
- **סקרים:** צפייה בסקרי מוכנות ממתינים, תגובה (תקין/לא תקין)
- **מיקום:** עדכון עיר נוכחית
- **Socket:** קבלת סקרים חדשים וסיום אירועים בזמן אמת

### קומפוננטות (Components)

| קומפוננטה | תיאור |
|-----------|--------|
| **Header** | כותרת, שם משתמש, כפתור התנתקות |
| **SoldiersMap** | מפת Leaflet עם סמני חיילים ועיגולי התרעות |
| **ToastContainer** | תצוגת הודעות Toast |

### Context (ניהול State)

| Context | תיאור |
|---------|--------|
| **AuthContext** | `user`, `token`, פונקציות: `login`, `register`, `logout`, `updateUser` — שימוש ב-localStorage |
| **SocketContext** | חיבור/ניתוק Socket.io לפי token, חשיפת `socket` ו-`connected` |

### Hooks
| Hook | תיאור |
|------|--------|
| **useToast** | ניהול הודעות toast — `showToast(message, type)`, הסרה אוטומטית אחרי 5 שניות |

### שירות API (`api.js`)
- מחלקת `API` מרכזית — כל הקריאות ל-REST API
- שימוש ב-`fetch` עם JWT ב-header
- פונקציות: `login`, `register`, `getMe`, `updateLocation`, `getAllSoldiers`, `getMySoldiers`, `getSoldierCities`, `triggerEvent`, `getActiveEvents`, `getAllEvents`, `getEventStatuses`, `endEvent`, `respondToEvent`, `getOrefAlerts`

### נתונים (`cityCoords.js`)
- מיפוי ערים (בעברית) לקואורדינטות `[lat, lng]` — משמש למפה ולעיגולי התרעות

---

## 🔄 זרימת עבודה ראשית

```
1. חייל/מפקד נכנסים → Login → JWT נשמר ב-localStorage
2. מפקד יוצר אירוע → Event נוצר ב-DB → Socket שולח לחיילים רלוונטיים → SMS נשלח
3. חייל מקבל סקר מוכנות → מגיב (ok / not_ok) → סטטוס מתעדכן → מפקד רואה בזמן אמת
4. Oref Polling → התרעות מפיקוד העורף → אירוע אוטומטי → חיילים מקבלים הודעה
5. מפקד רואה על המפה: מיקומי חיילים + עיגולי התרעות פעילות
```

---

## 🔑 סביבה (.env)
משתנים נדרשים (לא נכללים ב-repo):
- `MONGO_URI` — חיבור MongoDB
- `SECRET_KEY` — מפתח JWT
- `SMS_USER`, `SMS_PASS`, `SMS_FROM` — הגדרות SMS (019 API)
- `PORT` — פורט השרת (ברירת מחדל: 3000)

---

## 🚀 הרצה

```bash
# שרת
cd server && npm install && npm run dev

# לקוח
cd client && npm install && npm run dev

# Seed (נתוני דמו)
cd server && node seed.js
```
