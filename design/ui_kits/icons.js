// Shared line-icon set (Lucide-style) for the UI kits. Stroke 1.75, round caps.
// Exposed on window.AHIcon so all kit screens can use the same glyphs.
(function () {
  const P = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
    waves: "M2 12c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2M2 17c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2",
    ticket: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V7ZM14 5v14",
    badge: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 9h6M9 13h6",
    family: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1M17 11a3 3 0 1 0-1-5.83M22 20v-1a5 5 0 0 0-4-4.9",
    child: "M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2",
    teacher: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
    enroll: "M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M9 3h6v3H9zM9 12h6M9 16h4",
    clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7ZM2 10h20",
    check: "M20 6 9 17l-5-5",
    chart: "M3 3v18h18M7 14l3-3 3 3 5-6",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a7.5 7.5 0 0 0 .1-2l1.9-1.4-2-3.4-2.2.9a7.6 7.6 0 0 0-1.7-1l-.3-2.3H9.8l-.3 2.3a7.6 7.6 0 0 0-1.7 1l-2.2-.9-2 3.4L5.5 11a7.5 7.5 0 0 0 0 2l-1.9 1.4 2 3.4 2.2-.9a7.6 7.6 0 0 0 1.7 1l.3 2.3h4.4l.3-2.3a7.6 7.6 0 0 0 1.7-1l2.2.9 2-3.4Z",
    dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 11h8v10h-8zM3 13h8v8H3z",
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
    age: "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M4 21v-1a8 8 0 0 1 16 0v1",
    users: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-1a6 6 0 0 1 6-6M21 21v-1a6 6 0 0 0-4-5.66",
    shield: "M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z",
    phone: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 18l-1 3a16 16 0 0 1-13-13Z",
    drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z",
    wallet: "M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3h-5a2 2 0 0 1 0-4h5",
    hourglass: "M6 3h12M6 21h12M7 3c0 4 4 5 5 7-1 2-5 3-5 7M17 3c0 4-4 5-5 7 1 2 5 3 5 7",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
    menu: "M4 6h16M4 12h16M4 18h16",
    plus: "M12 5v14M5 12h14",
    arrow: "M19 12H5M12 19l-7-7 7-7",
    money: "M12 3v18M16 7a4 4 0 0 0-4-1.5C9.8 5.5 8 6.6 8 8.5S10 11 12 11s4 1 4 2.8-1.8 2.7-4 2.7A4 4 0 0 1 8 15",
  };
  window.AHIcon = function ({ name, size = 20, stroke = 1.75, style }) {
    const d = P[name] || "";
    return React.createElement("svg", {
      width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round",
      strokeLinejoin: "round", style, "aria-hidden": "true",
    }, React.createElement("path", { d }));
  };
})();
