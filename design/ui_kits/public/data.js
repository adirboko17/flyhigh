// Demo data for the על הגובה UI kits (Hebrew). Mirrors the spec's demo set.
window.AH_DATA = {
  brand: { name: "על הגובה", tagline: "חוגים, מסלולים וכניסות לבריכה", phone: "03-5556677", email: "info@al-hagova.co.il" },
  classes: [
    { id: "1", title: "חוג שחייה לילדים", category: "שחייה", level: "מתחילים",
      description: "קבוצות קטנות, מדריכות מוסמכות ויחס אישי לכל ילד. בניית ביטחון במים בקצב שלכם.",
      instructor: "דנה כהן", day: "שני", time: "16:30", endTime: "17:15",
      ageMin: 5, ageMax: 9, capacity: 12, taken: 8, available: 4, price: 280, status: "active" },
    { id: "2", title: "חוג שחייה מתקדמים", category: "שחייה", level: "מתקדמים",
      description: "שיפור סגנונות, סבולת וטכניקה לשחיינים מנוסים.",
      instructor: "דנה כהן", day: "רביעי", time: "17:30", endTime: "18:30",
      ageMin: 9, ageMax: 14, capacity: 10, taken: 10, available: 0, price: 320, status: "full" },
    { id: "3", title: "אקווה-ג'ימנסטיקה לפעוטות", category: "פעוטות", level: "התחלתי",
      description: "פעילות מים חווייתית להורה ופעוט, לפיתוח מוטורי ותחושת ביטחון.",
      instructor: "יעל אברהם", day: "ראשון", time: "09:00", endTime: "09:45",
      ageMin: 1, ageMax: 3, capacity: 8, taken: 3, available: 5, price: 240, status: "active" },
  ],
  programs: [
    { id: "p1", title: "מנוי חודשי — שחייה חופשית", description: "כניסה חופשית לבריכה בכל ימות החודש", price: 350 },
    { id: "p2", title: "מנוי משפחתי — 3 חודשים", description: "עד 4 בני משפחה, שחייה חופשית", price: 900 },
  ],
  poolPasses: [
    { id: "k1", title: "כניסה חד-פעמית", description: "כניסה בודדת לבריכה", price: 45 },
    { id: "k2", title: "כרטיסייה — 10 כניסות", description: "10 כניסות בתוקף לשנה", price: 400 },
  ],
  features: [
    { icon: "shield", title: "בטיחות לפני הכל", desc: "מדריכות מוסמכות, יחס אישי וקבוצות קטנות." },
    { icon: "phone", title: "הרשמה דיגיטלית", desc: "נרשמים, משלמים ומנהלים הכל אונליין, בעברית מלאה." },
    { icon: "drop", title: "מגוון פעילויות", desc: "חוגי שחייה, מסלולים חודשיים וכניסות חופשיות לבריכה." },
  ],
};
