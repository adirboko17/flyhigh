/* @ds-bundle: {"format":3,"namespace":"DesignSystem_820aee","components":[{"name":"Avatar","sourcePath":"components/avatar/Avatar.jsx"},{"name":"Badge","sourcePath":"components/badge/Badge.jsx"},{"name":"BrandLogo","sourcePath":"components/brandlogo/BrandLogo.jsx"},{"name":"Button","sourcePath":"components/button/Button.jsx"},{"name":"ButtonLink","sourcePath":"components/button/Button.jsx"},{"name":"Card","sourcePath":"components/card/Card.jsx"},{"name":"CardHeader","sourcePath":"components/card/Card.jsx"},{"name":"CardTitle","sourcePath":"components/card/Card.jsx"},{"name":"CardContent","sourcePath":"components/card/Card.jsx"},{"name":"CardFooter","sourcePath":"components/card/Card.jsx"},{"name":"ClassCard","sourcePath":"components/classcard/ClassCard.jsx"},{"name":"EmptyState","sourcePath":"components/emptystate/EmptyState.jsx"},{"name":"Input","sourcePath":"components/input/Input.jsx"},{"name":"Textarea","sourcePath":"components/input/Input.jsx"},{"name":"Select","sourcePath":"components/input/Input.jsx"},{"name":"Field","sourcePath":"components/input/Input.jsx"},{"name":"PageHeader","sourcePath":"components/pageheader/PageHeader.jsx"},{"name":"StatCard","sourcePath":"components/statcard/StatCard.jsx"},{"name":"Table","sourcePath":"components/table/Table.jsx"},{"name":"THead","sourcePath":"components/table/Table.jsx"},{"name":"TBody","sourcePath":"components/table/Table.jsx"},{"name":"TR","sourcePath":"components/table/Table.jsx"},{"name":"TH","sourcePath":"components/table/Table.jsx"},{"name":"TD","sourcePath":"components/table/Table.jsx"}],"sourceHashes":{"components/avatar/Avatar.jsx":"fd5fa27f9ad2","components/badge/Badge.jsx":"e9e567b682c8","components/brandlogo/BrandLogo.jsx":"fb063656e59d","components/button/Button.jsx":"294024d881c8","components/card/Card.jsx":"2a05500908ef","components/classcard/ClassCard.jsx":"57d0a7c0efab","components/emptystate/EmptyState.jsx":"85a41f9fa756","components/input/Input.jsx":"5ea16283a0f4","components/pageheader/PageHeader.jsx":"c54686e7d532","components/statcard/StatCard.jsx":"499d8e2c54ae","components/table/Table.jsx":"6c4185eb3735","ui_kits/AreaShell.jsx":"a82df04505dc","ui_kits/admin/AdminScreens.jsx":"7cd907fcdf80","ui_kits/admin/AdminShell.jsx":"56664b014cab","ui_kits/icons.js":"e5b6e4050fbb","ui_kits/image-slot.js":"9309434cb09c","ui_kits/instructor/screens.jsx":"191370992d24","ui_kits/parent/screens.jsx":"d8c2242debf7","ui_kits/public/PublicChrome.jsx":"4b3d33d11b6b","ui_kits/public/data.js":"930947ada33f","ui_kits/public/screens.jsx":"1bd5622d8a99"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_820aee = window.DesignSystem_820aee || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/avatar/Avatar.jsx
try { (() => {
function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join("");
}
function Avatar({
  name = "",
  src,
  size = "md",
  className = ""
}) {
  const cls = ["ah-avatar", size !== "md" ? `ah-avatar--${size}` : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    title: name
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/avatar/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/badge/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  tone = "neutral",
  dot = false,
  className = "",
  children,
  ...props
}) {
  const cls = ["ah-badge", `ah-badge--${tone}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, props), dot && /*#__PURE__*/React.createElement("span", {
    className: "ah-badge__dot"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badge/Badge.jsx", error: String((e && e.message) || e) }); }

// components/brandlogo/BrandLogo.jsx
try { (() => {
const LOGO_DEFAULT = "assets/alagova-logo.png";
function BrandLogo({
  src = LOGO_DEFAULT,
  height = 44,
  subtitle,
  href,
  className = ""
}) {
  const width = Math.round(height * 2.05);
  const img = /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "\u05E2\u05DC \u05D4\u05D2\u05D5\u05D1\u05D4",
    style: {
      height,
      width,
      objectFit: "contain",
      objectPosition: "center",
      display: "block"
    }
  });
  const inner = /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 12
    }
  }, img, subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      color: "var(--ink-400)"
    }
  }, subtitle));
  if (href) {
    return /*#__PURE__*/React.createElement("a", {
      href: href,
      style: {
        display: "inline-flex",
        textDecoration: "none",
        transition: "opacity 200ms"
      }
    }, inner);
  }
  return inner;
}
Object.assign(__ds_scope, { BrandLogo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brandlogo/BrandLogo.jsx", error: String((e && e.message) || e) }); }

// components/button/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...props
}) {
  const cls = ["ah-btn", `ah-btn--${variant}`, `ah-btn--${size}`, block ? "ah-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, props), children);
}
function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  href = "#",
  className = "",
  children,
  ...props
}) {
  const cls = ["ah-btn", `ah-btn--${variant}`, `ah-btn--${size}`, block ? "ah-btn--block" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("a", _extends({
    className: cls,
    href: href
  }, props), children);
}
Object.assign(__ds_scope, { Button, ButtonLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/button/Button.jsx", error: String((e && e.message) || e) }); }

// components/card/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["ah-card", className].filter(Boolean).join(" ")
  }, props), children);
}
function CardHeader({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["ah-card__header", className].filter(Boolean).join(" ")
  }, props), children);
}
function CardTitle({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("h3", _extends({
    className: ["ah-card__title", className].filter(Boolean).join(" ")
  }, props), children);
}
function CardContent({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["ah-card__content", className].filter(Boolean).join(" ")
  }, props), children);
}
function CardFooter({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["ah-card__footer", className].filter(Boolean).join(" ")
  }, props), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/card/Card.jsx", error: String((e && e.message) || e) }); }

// components/classcard/ClassCard.jsx
try { (() => {
const STATUS = {
  draft: {
    label: "טיוטה",
    tone: "neutral"
  },
  active: {
    label: "פעיל",
    tone: "success"
  },
  full: {
    label: "מלא",
    tone: "warning"
  },
  closed: {
    label: "סגור",
    tone: "danger"
  }
};

// Minimal inline line-icons (Lucide-style) so the card stays self-contained.
const Ico = {
  instructor: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  age: "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M4 21v-1a8 8 0 0 1 16 0v1",
  users: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-1a6 6 0 0 1 6-6M21 21v-1a6 6 0 0 0-4-5.66"
};
function Icon({
  d
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}
function shekel(n) {
  if (n == null) return "—";
  return "₪" + Number(n).toLocaleString("he-IL");
}
function ClassCard({
  title,
  description,
  instructor,
  day,
  time,
  ageMin,
  ageMax,
  available,
  capacity,
  price,
  category,
  status = "active",
  image,
  href = "#"
}) {
  const st = STATUS[status] || STATUS.active;
  const soldOut = available != null && available <= 0 || status === "full";
  const detail = {
    color: "var(--ink-600)",
    display: "flex",
    alignItems: "center",
    gap: 6
  };
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      textDecoration: "none",
      background: "var(--white)",
      border: "1px solid var(--ink-100)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      transition: "transform 300ms, box-shadow 300ms"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 176,
      width: "100%",
      overflow: "hidden",
      background: "var(--ink-100)"
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: title,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--brand-gradient)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "44",
    height: "44",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 16c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M2 20c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M6 12l5-5M18 12 9 3"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      insetInlineStart: 12,
      top: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: `ah-badge ah-badge--${st.tone}`
  }, st.label)), category && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 12,
      insetInlineEnd: 12,
      background: "rgba(255,255,255,0.9)",
      padding: "2px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "var(--text-xs)",
      fontWeight: 600,
      color: "var(--ink-700)"
    }
  }, category)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-lg)",
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: "var(--text-sm)",
      color: "var(--ink-500)",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, description), /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: "16px 0 0",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      rowGap: 8,
      fontSize: "var(--text-sm)"
    }
  }, instructor && /*#__PURE__*/React.createElement("div", {
    style: {
      ...detail,
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    d: Ico.instructor
  }), instructor), day && /*#__PURE__*/React.createElement("div", {
    style: detail
  }, /*#__PURE__*/React.createElement(Icon, {
    d: Ico.calendar
  }), "\u05D9\u05D5\u05DD ", day), time && /*#__PURE__*/React.createElement("div", {
    style: detail
  }, /*#__PURE__*/React.createElement(Icon, {
    d: Ico.clock
  }), time), (ageMin || ageMax) && /*#__PURE__*/React.createElement("div", {
    style: detail
  }, /*#__PURE__*/React.createElement(Icon, {
    d: Ico.age
  }), "\u05D2\u05D9\u05DC\u05D0\u05D9 ", ageMin, "\u2013", ageMax), /*#__PURE__*/React.createElement("div", {
    style: detail
  }, /*#__PURE__*/React.createElement(Icon, {
    d: Ico.users
  }), soldOut ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--red-600)"
    }
  }, "\u05DE\u05DC\u05D0") : /*#__PURE__*/React.createElement("span", null, available, " \u05DE\u05E7\u05D5\u05DE\u05D5\u05EA \u05E4\u05E0\u05D5\u05D9\u05D9\u05DD"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      paddingTop: 16,
      borderTop: "1px solid var(--ink-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--text-xl)",
      fontWeight: 800,
      color: "var(--brand-700)"
    }
  }, shekel(price)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--text-sm)",
      fontWeight: 600,
      color: "var(--brand-600)"
    }
  }, "\u05DC\u05E4\u05E8\u05D8\u05D9\u05DD \u05D5\u05D4\u05E8\u05E9\u05DE\u05D4 \u2190"))));
}
Object.assign(__ds_scope, { ClassCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/classcard/ClassCard.jsx", error: String((e && e.message) || e) }); }

// components/emptystate/EmptyState.jsx
try { (() => {
function EmptyState({
  title,
  description,
  icon,
  action,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["ah-empty", className].filter(Boolean).join(" ")
  }, icon && /*#__PURE__*/React.createElement("div", {
    className: "ah-empty__icon"
  }, icon), /*#__PURE__*/React.createElement("p", {
    className: "ah-empty__title"
  }, title), description && /*#__PURE__*/React.createElement("p", {
    className: "ah-empty__desc"
  }, description), action && /*#__PURE__*/React.createElement("div", {
    className: "ah-empty__action"
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/emptystate/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/input/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  className = "",
  error = false,
  success = false,
  ...props
}) {
  const cls = ["ah-input", error ? "is-error" : "", success ? "is-success" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("input", _extends({
    className: cls
  }, props));
}
function Textarea({
  className = "",
  error = false,
  ...props
}) {
  const cls = ["ah-textarea", error ? "is-error" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: cls
  }, props));
}
function Select({
  className = "",
  error = false,
  success = false,
  children,
  ...props
}) {
  const cls = ["ah-select", error ? "is-error" : "", success ? "is-success" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("select", _extends({
    className: cls
  }, props), children);
}
function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ah-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "ah-field__label",
    htmlFor: htmlFor
  }, label, required && /*#__PURE__*/React.createElement("span", {
    className: "ah-field__req"
  }, "*")), children, hint && !error && /*#__PURE__*/React.createElement("p", {
    className: "ah-field__hint"
  }, hint), error && /*#__PURE__*/React.createElement("p", {
    className: "ah-field__error"
  }, error));
}
Object.assign(__ds_scope, { Input, Textarea, Select, Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/input/Input.jsx", error: String((e && e.message) || e) }); }

// components/pageheader/PageHeader.jsx
try { (() => {
function PageHeader({
  title,
  description,
  action
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ah-page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "ah-page-header__title"
  }, title), description && /*#__PURE__*/React.createElement("p", {
    className: "ah-page-header__desc"
  }, description)), action && /*#__PURE__*/React.createElement("div", {
    className: "ah-page-header__actions"
  }, action));
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/pageheader/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/statcard/StatCard.jsx
try { (() => {
const TONES = {
  brand: {
    glow: "rgba(2, 163, 240, 0.10)",
    iconBg: "var(--brand-100)",
    iconFg: "var(--brand-600)"
  },
  aqua: {
    glow: "rgba(22, 176, 139, 0.10)",
    iconBg: "var(--aqua-100)",
    iconFg: "var(--aqua-600)"
  },
  amber: {
    glow: "rgba(245, 158, 11, 0.10)",
    iconBg: "var(--amber-100)",
    iconFg: "var(--amber-600)"
  },
  rose: {
    glow: "rgba(244, 63, 94, 0.10)",
    iconBg: "#ffe4e6",
    iconFg: "#e11d48"
  },
  violet: {
    glow: "rgba(139, 92, 246, 0.10)",
    iconBg: "#ede9fe",
    iconFg: "#7c3aed"
  },
  slate: {
    glow: "rgba(98, 115, 147, 0.10)",
    iconBg: "var(--ink-100)",
    iconFg: "var(--ink-600)"
  }
};
function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint
}) {
  const t = TONES[tone] || TONES.brand;
  return /*#__PURE__*/React.createElement("div", {
    className: "ah-stat"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ah-stat__glow",
    style: {
      background: `linear-gradient(to bottom left, ${t.glow}, transparent 70%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "ah-stat__row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "ah-stat__label"
  }, label), /*#__PURE__*/React.createElement("p", {
    className: "ah-stat__value"
  }, value), hint && /*#__PURE__*/React.createElement("p", {
    className: "ah-stat__hint"
  }, hint)), icon && /*#__PURE__*/React.createElement("div", {
    className: "ah-stat__icon",
    style: {
      background: t.iconBg,
      color: t.iconFg
    }
  }, icon)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/statcard/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/table/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Table({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "ah-table-wrap"
  }, /*#__PURE__*/React.createElement("table", _extends({
    className: ["ah-table", className].filter(Boolean).join(" ")
  }, props), children));
}
function THead({
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("thead", props, children);
}
function TBody({
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("tbody", props, children);
}
function TR({
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("tr", props, children);
}
function TH({
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("th", props, children);
}
function TD({
  className = "",
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("td", _extends({
    className: className
  }, props), children);
}
Object.assign(__ds_scope, { Table, THead, TBody, TR, TH, TD });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/table/Table.jsx", error: String((e && e.message) || e) }); }

// ui_kits/AreaShell.jsx
try { (() => {
// Generic area shell (instructor / parent) — RTL sidebar + topbar. window.AreaShell(...)
const {
  BrandLogo,
  Avatar
} = window.DesignSystem_820aee;
const ShIc = window.AHIcon;
function AreaShell({
  nav,
  active,
  onNav,
  logoSrc,
  area,
  user,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      background: "var(--ink-50)",
      flexDirection: "row-reverse"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 272,
      flexShrink: 0,
      borderInlineStart: "1px solid var(--ink-100)",
      background: "var(--white)",
      position: "sticky",
      top: 0,
      height: "100vh",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--ink-100)",
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 38,
    subtitle: area
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: 12
    }
  }, nav.map(it => {
    const on = active === it.key;
    return /*#__PURE__*/React.createElement("a", {
      key: it.key,
      onClick: () => onNav(it.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 14,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        color: on ? "#fff" : "var(--ink-600)",
        background: on ? "var(--brand-gradient)" : "transparent",
        boxShadow: on ? "var(--shadow-glow)" : "none"
      }
    }, /*#__PURE__*/React.createElement(ShIc, {
      name: it.icon,
      size: 19
    }), it.label);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minWidth: 0,
      flex: 1,
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--ink-100)",
      background: "rgba(255,255,255,0.8)",
      padding: "12px 20px",
      backdropFilter: "blur(8px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05E9\u05DC\u05D5\u05DD, ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--ink-800)"
    }
  }, user.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      color: "var(--ink-500)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(ShIc, {
    name: "logout",
    size: 16
  }), " \u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "left",
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-800)"
    }
  }, user.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: "var(--ink-400)"
    }
  }, user.role)), /*#__PURE__*/React.createElement(Avatar, {
    name: user.name
  })))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: 32
    }
  }, children)));
}
window.AreaShell = AreaShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/AreaShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminScreens.jsx
try { (() => {
// Admin screens. window.AdminScreens = { dashboard, classes, newClass, customers, enrollments, payments }
const {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Avatar,
  Field,
  Input,
  Select,
  Textarea
} = window.DesignSystem_820aee;
const AI = window.AHIcon;
const AD = window.AH_DATA;
const ils = n => "₪" + Number(n).toLocaleString("he-IL");
const CUSTOMERS = [{
  name: "מיכל לוי",
  phone: "052-1112233",
  email: "michal@mail.com",
  kids: 2,
  joined: "ינואר 2026"
}, {
  name: "יוסי כהן",
  phone: "054-9988776",
  email: "yossi@mail.com",
  kids: 1,
  joined: "פברואר 2026"
}, {
  name: "רונית אברהם",
  phone: "050-4455667",
  email: "ronit@mail.com",
  kids: 3,
  joined: "מרץ 2026"
}, {
  name: "דוד פרץ",
  phone: "053-2233445",
  email: "david@mail.com",
  kids: 1,
  joined: "מרץ 2026"
}];
const ENROLLMENTS = [{
  activity: "חוג שחייה לילדים",
  parent: "מיכל לוי",
  child: "איתי לוי",
  type: "חוג",
  status: ["success", "פעיל"],
  pay: ["success", "שולם"],
  date: "12.03.26"
}, {
  activity: "אקווה-ג'ימנסטיקה",
  parent: "רונית אברהם",
  child: "נועה אברהם",
  type: "חוג",
  status: ["warning", "ממתין"],
  pay: ["danger", "לא שולם"],
  date: "14.03.26"
}, {
  activity: "מנוי חודשי",
  parent: "יוסי כהן",
  child: "—",
  type: "מסלול",
  status: ["success", "פעיל"],
  pay: ["warning", "שולם חלקית"],
  date: "10.03.26"
}, {
  activity: "חוג שחייה מתקדמים",
  parent: "דוד פרץ",
  child: "עומר פרץ",
  type: "חוג",
  status: ["info", "הושלם"],
  pay: ["success", "שולם"],
  date: "01.02.26"
}];
const PAYMENTS = [{
  parent: "מיכל לוי",
  amount: 280,
  method: "כרטיס אשראי",
  status: ["success", "שולם"],
  date: "12.03.26"
}, {
  parent: "יוסי כהן",
  amount: 350,
  method: "ביט",
  status: ["success", "שולם"],
  date: "10.03.26"
}, {
  parent: "רונית אברהם",
  amount: 240,
  method: "הוראת קבע",
  status: ["warning", "ממתין"],
  date: "14.03.26"
}, {
  parent: "דוד פרץ",
  amount: 320,
  method: "פייבוקס",
  status: ["danger", "נכשל"],
  date: "09.03.26"
}];
function Dashboard() {
  const i = n => /*#__PURE__*/React.createElement(AI, {
    name: n,
    size: 22
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 \u05E0\u05D9\u05D4\u05D5\u05DC"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05E1\u05E7\u05D9\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA \u05E9\u05DC \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D1\u05E2\u05E1\u05E7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(6,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA",
    value: 128,
    icon: i("family"),
    tone: "brand"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D9\u05DC\u05D3\u05D9\u05DD",
    value: 213,
    icon: i("child"),
    tone: "aqua"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D7\u05D5\u05D2\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD",
    value: 9,
    icon: i("waves"),
    tone: "violet"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA",
    value: 64,
    icon: i("enroll"),
    tone: "amber"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E4\u05EA\u05D5\u05D7\u05D9\u05DD",
    value: 7,
    icon: i("card"),
    tone: "rose"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4",
    value: 11,
    icon: i("hourglass"),
    tone: "slate"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA"), /*#__PURE__*/React.createElement("a", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--brand-600)",
      cursor: "pointer"
    }
  }, "\u05D4\u05DB\u05DC \u2190")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: "none"
    }
  }, ENROLLMENTS.map((e, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 0",
      borderTop: k ? "1px solid var(--ink-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, e.activity), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, e.parent, e.child !== "—" ? " · " + e.child : "")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: e.pay[0]
  }, e.pay[1]), /*#__PURE__*/React.createElement(Badge, {
    tone: e.status[0]
  }, e.status[1]))))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 20,
      background: "var(--brand-gradient)",
      padding: 20,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: "rgba(255,255,255,0.8)"
    }
  }, "\u05E1\u05DA \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA (\u05E9\u05D5\u05DC\u05DE\u05D5)"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800
    }
  }, ils(48200))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 14,
      background: "var(--amber-100)",
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "var(--amber-700)"
    }
  }, "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "var(--amber-700)"
    }
  }, "7")), /*#__PURE__*/React.createElement("a", {
    style: {
      display: "block",
      borderRadius: 14,
      border: "1px solid var(--ink-200)",
      padding: "12px 16px",
      textAlign: "center",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-700)",
      cursor: "pointer"
    }
  }, "\u05DC\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D3\u05D5\u05D7\u05D5\u05EA \u05D4\u05DE\u05DC\u05D0\u05D9\u05DD \u2190"))))));
}
function ClassesScreen({
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05E0\u05D9\u05D4\u05D5\u05DC \u05D7\u05D5\u05D2\u05D9\u05DD",
    description: "\u05D9\u05E6\u05D9\u05E8\u05D4, \u05E2\u05E8\u05D9\u05DB\u05D4 \u05D5\u05E0\u05D9\u05D4\u05D5\u05DC \u05E9\u05DC \u05DB\u05DC \u05D4\u05D7\u05D5\u05D2\u05D9\u05DD",
    action: /*#__PURE__*/React.createElement(Button, {
      onClick: () => onNav && onNav("newClass")
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(AI, {
      name: "plus",
      size: 16
    }), "\u05D7\u05D5\u05D2 \u05D7\u05D3\u05E9"))
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05E9\u05DD \u05D4\u05D7\u05D5\u05D2"), /*#__PURE__*/React.createElement(TH, null, "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05D9\u05D5\u05DD \u05D5\u05E9\u05E2\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05DE\u05D7\u05D9\u05E8"), /*#__PURE__*/React.createElement(TH, null, "\u05DE\u05DB\u05E1\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D8\u05D8\u05D5\u05E1"))), /*#__PURE__*/React.createElement(TBody, null, AD.classes.map(c => /*#__PURE__*/React.createElement(TR, {
    key: c.id
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, c.title, /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: 8,
      fontSize: 12,
      fontWeight: 400,
      color: "var(--ink-400)"
    }
  }, c.category)), /*#__PURE__*/React.createElement(TD, null, c.instructor), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, "\u05D9\u05D5\u05DD ", c.day, " \xB7 ", c.time), /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 500
    }
  }, ils(c.price)), /*#__PURE__*/React.createElement(TD, null, c.taken, "/", c.capacity), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: c.status === "full" ? "warning" : "success"
  }, c.status === "full" ? "מלא" : "פעיל"))))))));
}
function NewClassScreen({
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24,
      maxWidth: 820
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05D9\u05E6\u05D9\u05E8\u05EA \u05D7\u05D5\u05D2 \u05D7\u05D3\u05E9",
    description: "\u05DE\u05DC\u05D0\u05D5 \u05D0\u05EA \u05E4\u05E8\u05D8\u05D9 \u05D4\u05D7\u05D5\u05D2. \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05E8\u05D5\u05DA \u05D1\u05DB\u05DC \u05E2\u05EA."
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u05E9\u05DD \u05D4\u05D7\u05D5\u05D2",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: \u05D7\u05D5\u05D2 \u05E9\u05D7\u05D9\u05D9\u05D4 \u05DC\u05D9\u05DC\u05D3\u05D9\u05DD"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05EA\u05D9\u05D0\u05D5\u05E8"
  }, /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "\u05EA\u05D9\u05D0\u05D5\u05E8 \u05E7\u05E6\u05E8 \u05E9\u05DC \u05D4\u05D7\u05D5\u05D2, \u05DE\u05D4 \u05DB\u05D5\u05DC\u05DC, \u05DC\u05DE\u05D9 \u05DE\u05EA\u05D0\u05D9\u05DD..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05E9\u05D7\u05D9\u05D9\u05D4"), /*#__PURE__*/React.createElement("option", null, "\u05E4\u05E2\u05D5\u05D8\u05D5\u05EA"), /*#__PURE__*/React.createElement("option", null, "\u05D0\u05E7\u05D5\u05D5\u05D4"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E8\u05DE\u05D4"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD"), /*#__PURE__*/React.createElement("option", null, "\u05DE\u05EA\u05E7\u05D3\u05DE\u05D9\u05DD"), /*#__PURE__*/React.createElement("option", null, "\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05D2\u05D9\u05DC \u05DE\u05D9\u05E0\u05D9\u05DE\u05D5\u05DD"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "number",
    placeholder: "5"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05D2\u05D9\u05DC \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "number",
    placeholder: "9"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05DE\u05DB\u05E1\u05EA \u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "number",
    placeholder: "12"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05DE\u05D7\u05D9\u05E8 (\u20AA)",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "number",
    placeholder: "280"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D4"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05D3\u05E0\u05D4 \u05DB\u05D4\u05DF"), /*#__PURE__*/React.createElement("option", null, "\u05D9\u05E2\u05DC \u05D0\u05D1\u05E8\u05D4\u05DD"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05D9\u05D5\u05DD \u05D1\u05E9\u05D1\u05D5\u05E2"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05E8\u05D0\u05E9\u05D5\u05DF"), /*#__PURE__*/React.createElement("option", null, "\u05E9\u05E0\u05D9"), /*#__PURE__*/React.createElement("option", null, "\u05E9\u05DC\u05D9\u05E9\u05D9"), /*#__PURE__*/React.createElement("option", null, "\u05E8\u05D1\u05D9\u05E2\u05D9"), /*#__PURE__*/React.createElement("option", null, "\u05D7\u05DE\u05D9\u05E9\u05D9"))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E9\u05E2\u05EA \u05D4\u05EA\u05D7\u05DC\u05D4"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "time",
    dir: "ltr"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E9\u05E2\u05EA \u05E1\u05D9\u05D5\u05DD"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "time",
    dir: "ltr"
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E1\u05D8\u05D8\u05D5\u05E1"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05D8\u05D9\u05D5\u05D8\u05D4"), /*#__PURE__*/React.createElement("option", null, "\u05E4\u05E2\u05D9\u05DC"), /*#__PURE__*/React.createElement("option", null, "\u05DE\u05DC\u05D0"), /*#__PURE__*/React.createElement("option", null, "\u05E1\u05D2\u05D5\u05E8"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      borderTop: "1px solid var(--ink-100)",
      paddingTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => onNav("classes")
  }, "\u05E9\u05DE\u05D9\u05E8\u05EA \u05D7\u05D5\u05D2"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    onClick: () => onNav("classes")
  }, "\u05D1\u05D9\u05D8\u05D5\u05DC"))))));
}
function CustomersScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA",
    description: "\u05DB\u05DC \u05D4\u05D4\u05D5\u05E8\u05D9\u05DD \u05D4\u05E8\u05E9\u05D5\u05DE\u05D9\u05DD \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "outline"
    }, "\u05D9\u05D9\u05E6\u05D5\u05D0 \u05DC\u05D0\u05E7\u05E1\u05DC")
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05E9\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05D8\u05DC\u05E4\u05D5\u05DF"), /*#__PURE__*/React.createElement(TH, null, "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC"), /*#__PURE__*/React.createElement(TH, null, "\u05D9\u05DC\u05D3\u05D9\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA"))), /*#__PURE__*/React.createElement(TBody, null, CUSTOMERS.map((c, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, c.name))), /*#__PURE__*/React.createElement(TD, {
    dir: "ltr",
    style: {
      textAlign: "right",
      color: "var(--ink-600)"
    }
  }, c.phone), /*#__PURE__*/React.createElement(TD, {
    dir: "ltr",
    style: {
      textAlign: "right",
      color: "var(--ink-600)"
    }
  }, c.email), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, c.kids)), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, c.joined)))))));
}
function EnrollmentsScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA",
    description: "\u05DB\u05DC \u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05DC\u05D7\u05D5\u05D2\u05D9\u05DD, \u05DE\u05E1\u05DC\u05D5\u05DC\u05D9\u05DD \u05D5\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA"
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement(TH, null, "\u05D4\u05D5\u05E8\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05D9\u05DC\u05D3"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D5\u05D2"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D8\u05D8\u05D5\u05E1"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05E9\u05DC\u05D5\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA"))), /*#__PURE__*/React.createElement(TBody, null, ENROLLMENTS.map((e, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, e.activity), /*#__PURE__*/React.createElement(TD, null, e.parent), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, e.child), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, e.type)), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: e.status[0]
  }, e.status[1])), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: e.pay[0]
  }, e.pay[1])), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, e.date)))))));
}
function PaymentsScreen() {
  const i = n => /*#__PURE__*/React.createElement(AI, {
    name: n,
    size: 22
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD",
    description: "\u05DE\u05E2\u05E7\u05D1 \u05D2\u05D1\u05D9\u05D9\u05D4 \u05D5\u05EA\u05E0\u05D5\u05E2\u05D5\u05EA \u05D0\u05E9\u05E8\u05D0\u05D9"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05E0\u05D2\u05D1\u05D4 \u05D4\u05D7\u05D5\u05D3\u05E9",
    value: ils(48200),
    icon: i("wallet"),
    tone: "aqua"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D2\u05D1\u05D9\u05D9\u05D4",
    value: ils(2140),
    icon: i("hourglass"),
    tone: "amber"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05E1\u05DA \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA",
    value: 186,
    icon: i("card"),
    tone: "brand"
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05D4\u05D5\u05E8\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05DB\u05D5\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05D0\u05DE\u05E6\u05E2\u05D9"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D8\u05D8\u05D5\u05E1"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA"))), /*#__PURE__*/React.createElement(TBody, null, PAYMENTS.map((p, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, p.parent), /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600
    }
  }, ils(p.amount)), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, p.method), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: p.status[0]
  }, p.status[1])), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, p.date)))))));
}
function PlaceholderScreen({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: title,
    description: "\u05DE\u05E1\u05DA \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4 \u05D1\u05DE\u05E2\u05E8\u05DA \u05D4\u05E2\u05D9\u05E6\u05D5\u05D1"
  }), /*#__PURE__*/React.createElement(window.DesignSystem_820aee.EmptyState, {
    icon: /*#__PURE__*/React.createElement(AI, {
      name: "settings",
      size: 24
    }),
    title: "מסך " + title,
    description: "\u05D4\u05DE\u05E1\u05DA \u05D4\u05D6\u05D4 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D0\u05D5\u05EA\u05DD \u05E8\u05DB\u05D9\u05D1\u05D9\u05DD \u2014 \u05D8\u05D1\u05DC\u05D0\u05D5\u05EA, \u05DB\u05E8\u05D8\u05D9\u05E1\u05D9\u05DD, badges \u05D5\u05DB\u05E4\u05EA\u05D5\u05E8\u05D9\u05DD \u2014 \u05DB\u05DE\u05D5 \u05E9\u05D0\u05E8 \u05D0\u05D6\u05D5\u05E8 \u05D4\u05E0\u05D9\u05D4\u05D5\u05DC."
  }));
}
window.AdminScreens = {
  Dashboard,
  ClassesScreen,
  NewClassScreen,
  CustomersScreen,
  EnrollmentsScreen,
  PaymentsScreen,
  PlaceholderScreen
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/admin/AdminShell.jsx
try { (() => {
// Admin shell — right-side sidebar (RTL) + topbar. window.AdminShell({active,onNav,logoSrc,children})
const {
  BrandLogo,
  Avatar
} = window.DesignSystem_820aee;
const AdmIc = window.AHIcon;
const ADMIN_NAV = [{
  key: "dashboard",
  label: "דשבורד",
  icon: "dashboard"
}, {
  key: "classes",
  label: "חוגים",
  icon: "waves"
}, {
  key: "programs",
  label: "מסלולים",
  icon: "ticket"
}, {
  key: "pool",
  label: "כניסות לבריכה",
  icon: "badge"
}, {
  key: "customers",
  label: "לקוחות",
  icon: "family"
}, {
  key: "children",
  label: "ילדים",
  icon: "child"
}, {
  key: "instructors",
  label: "מדריכות",
  icon: "teacher"
}, {
  key: "enrollments",
  label: "הרשמות",
  icon: "enroll"
}, {
  key: "waitlist",
  label: "רשימת המתנה",
  icon: "hourglass"
}, {
  key: "payments",
  label: "תשלומים",
  icon: "card"
}, {
  key: "attendance",
  label: "נוכחות",
  icon: "check"
}, {
  key: "reports",
  label: "דוחות",
  icon: "chart"
}, {
  key: "settings",
  label: "הגדרות",
  icon: "settings"
}];
function AdminShell({
  active,
  onNav,
  logoSrc,
  area = "אזור ניהול",
  user = {
    name: "איתן מנהל",
    role: "מנהל"
  },
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      background: "var(--ink-50)",
      flexDirection: "row-reverse"
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 288,
      flexShrink: 0,
      borderInlineStart: "1px solid var(--ink-100)",
      background: "var(--white)",
      position: "sticky",
      top: 0,
      height: "100vh",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--ink-100)",
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 38,
    subtitle: area
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: 12,
      overflowY: "auto"
    }
  }, ADMIN_NAV.map(it => {
    const on = active === it.key;
    return /*#__PURE__*/React.createElement("a", {
      key: it.key,
      onClick: () => onNav(it.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 14,
        padding: "10px 14px",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        color: on ? "#fff" : "var(--ink-600)",
        background: on ? "var(--brand-gradient)" : "transparent",
        boxShadow: on ? "var(--shadow-glow)" : "none"
      }
    }, /*#__PURE__*/React.createElement(AdmIc, {
      name: it.icon,
      size: 19
    }), it.label);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minWidth: 0,
      flex: 1,
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--ink-100)",
      background: "rgba(255,255,255,0.8)",
      padding: "12px 20px",
      backdropFilter: "blur(8px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05E9\u05DC\u05D5\u05DD, ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--ink-800)"
    }
  }, user.name)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      color: "var(--ink-500)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(AdmIc, {
    name: "logout",
    size: 16
  }), " \u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "left",
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-800)"
    }
  }, user.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: "var(--ink-400)"
    }
  }, user.role)), /*#__PURE__*/React.createElement(Avatar, {
    name: user.name
  })))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: 32
    }
  }, children)));
}
window.AdminShell = AdminShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/admin/AdminShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/icons.js
try { (() => {
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
    money: "M12 3v18M16 7a4 4 0 0 0-4-1.5C9.8 5.5 8 6.6 8 8.5S10 11 12 11s4 1 4 2.8-1.8 2.7-4 2.7A4 4 0 0 1 8 15"
  };
  window.AHIcon = function ({
    name,
    size = 20,
    stroke = 1.75,
    style
  }) {
    const d = P[name] || "";
    return React.createElement("svg", {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style,
      "aria-hidden": "true"
    }, React.createElement("path", {
      d
    }));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/icons.js", error: String((e && e.message) || e) }); }

// ui_kits/image-slot.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <image-slot> — user-fillable image placeholder.
 *
 * Drop this into a deck, mockup, or page wherever you want the user to
 * supply an image. You control the slot's shape and size; the user fills it
 * by dragging an image file onto it (or clicking to browse). The dropped
 * image persists across reloads via a .image-slots.state.json sidecar —
 * same read-via-fetch / write-via-window.omelette pattern as
 * design_canvas.jsx, so the filled slot shows on share links, downloaded
 * zips, and PPTX export. Outside the omelette runtime the slot is read-only.
 *
 * The host bridge only allows sidecar writes at the project root, so the
 * HTML that uses this component is assumed to live at the project root too
 * (same constraint as design_canvas.jsx).
 *
 * Attributes:
 *   id           Persistence key. REQUIRED for the drop to survive reload —
 *                every slot on the page needs a distinct id.
 *   shape        'rect' | 'rounded' | 'circle' | 'pill'   (default 'rounded')
 *                'circle' applies 50% border-radius; on a non-square slot
 *                that's an ellipse — set equal width and height for a true
 *                circle.
 *   radius       Corner radius in px for 'rounded'.       (default 12)
 *   mask         Any CSS clip-path value. Overrides `shape` — use this for
 *                hexagons, blobs, arbitrary polygons.
 *   fit          object-fit: cover | contain | fill.       (default 'cover')
 *                With cover (the default) double-clicking the filled slot
 *                enters a reframe mode: the whole image spills past the mask
 *                (translucent outside, opaque inside), drag to reposition,
 *                corner-drag to scale. The crop persists alongside the image
 *                in the sidecar. contain/fill stay static.
 *   position     object-position for fit=contain|fill.     (default '50% 50%')
 *   placeholder  Empty-state caption.                      (default 'Drop an image')
 *   src          Optional initial/fallback image URL. A user drop overrides
 *                it; clearing the drop reveals src again.
 *
 * Size and layout come from ordinary CSS on the element — width/height
 * inline or from a parent grid — so it composes with any layout.
 *
 * Usage:
 *   <image-slot id="hero"   style="width:800px;height:450px" shape="rounded" radius="20"
 *               placeholder="Drop a hero image"></image-slot>
 *   <image-slot id="avatar" style="width:120px;height:120px" shape="circle"></image-slot>
 *   <image-slot id="kite"   style="width:300px;height:300px"
 *               mask="polygon(50% 0, 100% 50%, 50% 100%, 0 50%)"></image-slot>
 */
/* END USAGE */

(() => {
  const STATE_FILE = '.image-slots.state.json';
  // 2× a ~600px slot in a 1920-wide deck — retina-sharp without making the
  // sidecar enormous. A 1200px WebP at q=0.85 is ~150-300KB.
  const MAX_DIM = 1200;
  // Raster formats only. SVG is excluded (can carry script; createImageBitmap
  // on SVG blobs is inconsistent). GIF is excluded because the canvas
  // re-encode keeps only the first frame, so an animated GIF would silently
  // go still — better to reject than surprise.
  const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

  // ── Shared sidecar store ────────────────────────────────────────────────
  // One fetch + immediate write-on-change for every <image-slot> on the
  // page. Reads via fetch() so viewing works anywhere the HTML and sidecar
  // are served together; writes go through window.omelette.writeFile, which
  // the host allowlists to *.state.json basenames only.
  const subs = new Set();
  let slots = {};
  // ids explicitly cleared before the sidecar fetch resolved — otherwise
  // the merge below can't tell "never set" from "just deleted" and would
  // resurrect the sidecar's stale value.
  const tombstones = new Set();
  let loaded = false;
  let loadP = null;
  function load() {
    if (loadP) return loadP;
    loadP = fetch(STATE_FILE).then(r => r.ok ? r.json() : null).then(j => {
      // Merge: sidecar loses to any in-memory change that raced ahead of
      // the fetch (drop or clear) so neither is clobbered by hydration.
      if (j && typeof j === 'object') {
        const merged = Object.assign({}, j, slots);
        // A framing-only write that raced ahead of hydration must not
        // drop a user image that's only on disk — inherit u from the
        // sidecar for any in-memory entry that lacks one.
        for (const k in slots) {
          if (merged[k] && !merged[k].u && j[k]) {
            merged[k].u = typeof j[k] === 'string' ? j[k] : j[k].u;
          }
        }
        for (const id of tombstones) delete merged[id];
        slots = merged;
      }
      tombstones.clear();
    }).catch(() => {}).then(() => {
      loaded = true;
      subs.forEach(fn => fn());
    });
    return loadP;
  }

  // Serialize writes so two near-simultaneous drops on different slots
  // can't reorder at the backend and leave the sidecar with only the
  // first. A save requested mid-flight just marks dirty and re-fires on
  // completion with the then-current slots.
  let saving = false;
  let saveDirty = false;
  function save() {
    if (saving) {
      saveDirty = true;
      return;
    }
    const w = window.omelette && window.omelette.writeFile;
    if (!w) return;
    saving = true;
    Promise.resolve(w(STATE_FILE, JSON.stringify(slots))).catch(() => {}).then(() => {
      saving = false;
      if (saveDirty) {
        saveDirty = false;
        save();
      }
    });
  }
  const S_MAX = 5;
  const clampS = s => Math.max(1, Math.min(S_MAX, s));

  // Normalize a stored slot value. Pre-reframe sidecars stored a bare
  // data-URL string; newer ones store {u, s, x, y}. Either shape is valid.
  function getSlot(id) {
    const v = slots[id];
    if (!v) return null;
    return typeof v === 'string' ? {
      u: v,
      s: 1,
      x: 0,
      y: 0
    } : v;
  }
  function setSlot(id, val) {
    if (!id) return;
    if (val) {
      slots[id] = val;
      tombstones.delete(id);
    } else {
      delete slots[id];
      if (!loaded) tombstones.add(id);
    }
    subs.forEach(fn => fn());
    // A drop is rare + high-value — write immediately so nav-away can't lose
    // it. Gate on the initial read so we don't overwrite a sidecar we haven't
    // merged yet; the merge in load() keeps this change once the read lands.
    if (loaded) save();else load().then(save);
  }

  // ── Image downscale ─────────────────────────────────────────────────────
  // Encode through a canvas so the sidecar carries resized bytes, not the
  // raw upload. Longest side is capped at 2× the slot's rendered width
  // (retina) and at MAX_DIM. WebP keeps alpha and is ~10× smaller than PNG
  // for photos, so there's no need for per-image format picking.
  async function toDataUrl(file, targetW) {
    const bitmap = await createImageBitmap(file);
    try {
      const cap = Math.min(MAX_DIM, Math.max(1, Math.round(targetW * 2)) || MAX_DIM);
      const scale = Math.min(1, cap / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
      return canvas.toDataURL('image/webp', 0.85);
    } finally {
      bitmap.close && bitmap.close();
    }
  }

  // ── Custom element ──────────────────────────────────────────────────────
  const stylesheet = ':host{display:inline-block;position:relative;vertical-align:top;' + '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' + '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
  // .frame img (clipped) and .spill (unclipped ghost + handles) share the
  // same left/top/width/height in frame-%, computed by _applyView(), so the
  // inside-mask crop and the outside-mask spill stay pixel-aligned.
  '.frame img{position:absolute;max-width:none;transform:translate(-50%,-50%);' + '  -webkit-user-drag:none;user-select:none;touch-action:none}' +
  // Reframe mode (double-click): the full image spills past the mask. The
  // spill layer is sized to the IMAGE bounds so its corners are where the
  // resize handles belong. The ghost <img> inside is translucent; the real
  // clipped <img> underneath shows the opaque in-mask crop.
  '.spill{position:absolute;transform:translate(-50%,-50%);display:none;z-index:1;' + '  cursor:grab;touch-action:none}' + ':host([data-panning]) .spill{cursor:grabbing}' + '.spill .ghost{position:absolute;inset:0;width:100%;height:100%;opacity:.35;' + '  pointer-events:none;-webkit-user-drag:none;user-select:none;' + '  box-shadow:0 0 0 1px rgba(0,0,0,.2),0 12px 32px rgba(0,0,0,.2)}' + '.spill .handle{position:absolute;width:12px;height:12px;border-radius:50%;' + '  background:#fff;box-shadow:0 0 0 1.5px #c96442,0 1px 3px rgba(0,0,0,.3);' + '  transform:translate(-50%,-50%)}' + '.spill .handle[data-c=nw]{left:0;top:0;cursor:nwse-resize}' + '.spill .handle[data-c=ne]{left:100%;top:0;cursor:nesw-resize}' + '.spill .handle[data-c=sw]{left:0;top:100%;cursor:nesw-resize}' + '.spill .handle[data-c=se]{left:100%;top:100%;cursor:nwse-resize}' + ':host([data-reframe]){z-index:10}' + ':host([data-reframe]) .spill{display:block}' + ':host([data-reframe]) .frame{box-shadow:0 0 0 2px #c96442}' + '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' + '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' + '  cursor:pointer;user-select:none}' + '.empty svg{opacity:.45}' + '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' + '.empty .sub{font-size:11px}' + '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' + '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' + ':host([data-over]) .frame{outline:2px solid #c96442;outline-offset:-2px;' + '  background:rgba(201,100,66,.10)}' + '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);' + '  transition:border-color .12s}' + ':host([data-over]) .ring{border-color:#c96442}' + ':host([data-filled]) .ring{display:none}' +
  // Controls sit BELOW the mask (top:100%), absolutely positioned so the
  // author-declared slot height is unaffected. The gap is padding, not a
  // top offset, so the hover target stays contiguous with the frame.
  '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' + '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;' + '  white-space:nowrap}' + ':host([data-filled][data-editable]:hover) .ctl,:host([data-reframe]) .ctl' + '  {opacity:1;pointer-events:auto}' + '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' + '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;' + '  backdrop-filter:blur(6px)}' + '.ctl button:hover{background:rgba(0,0,0,.8)}' + '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' + '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none}';
  const icon = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' + 'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' + '<path d="m21 15-5-5L5 21"/></svg>';
  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'mask', 'fit', 'position', 'placeholder', 'src', 'id'];
    }
    constructor() {
      super();
      const root = this.attachShadow({
        mode: 'open'
      });
      // .spill and .ctl sit OUTSIDE .frame so overflow:hidden + border-radius
      // on the frame (circle, pill, rounded) can't clip them.
      root.innerHTML = '<style>' + stylesheet + '</style>' + '<div class="frame" part="frame">' + '  <img part="image" alt="" draggable="false" style="display:none">' + '  <div class="empty" part="empty">' + icon + '    <div class="cap"></div>' + '    <div class="sub">or <u>browse files</u></div></div>' + '  <div class="ring" part="ring"></div>' + '</div>' + '<div class="spill">' + '  <img class="ghost" alt="" draggable="false">' + '  <div class="handle" data-c="nw"></div><div class="handle" data-c="ne"></div>' + '  <div class="handle" data-c="sw"></div><div class="handle" data-c="se"></div>' + '</div>' + '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' + '  <button data-act="clear" title="Remove image">Remove</button></div>' + '<input type="file" accept="' + ACCEPT.join(',') + '" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._sub = root.querySelector('.sub');
      this._spill = root.querySelector('.spill');
      this._ghost = root.querySelector('.ghost');
      this._err = null;
      this._input = root.querySelector('input');
      this._depth = 0;
      this._gen = 0;
      this._view = {
        s: 1,
        x: 0,
        y: 0
      };
      this._subFn = () => this._render();
      // Shadow-DOM listeners live with the shadow DOM — bound once here so
      // disconnect/reconnect (e.g. React remount) doesn't stack handlers.
      this._empty.addEventListener('click', () => this._input.click());
      root.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (act === 'replace') {
          this._exitReframe(true);
          this._input.click();
        }
        if (act === 'clear') {
          this._exitReframe(false);
          this._gen++;
          this._local = null;
          if (this.id) setSlot(this.id, null);else this._render();
        }
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
      // naturalWidth/Height aren't known until load — re-apply so the cover
      // baseline is computed from real dimensions, not the 100%×100% fallback.
      this._img.addEventListener('load', () => this._applyView());
      // Gated on editable + fit=cover so share links and contain/fill slots
      // stay static.
      this.addEventListener('dblclick', e => {
        if (!this.hasAttribute('data-editable') || !this._reframes()) return;
        e.preventDefault();
        if (this.hasAttribute('data-reframe')) this._exitReframe(true);else this._enterReframe();
      });
      // Pan + resize both originate on the spill layer. A handle pointerdown
      // drives an aspect-locked resize anchored at the opposite corner; any
      // other pointerdown on the spill pans. Offsets are frame-% so a
      // reframed slot survives responsive resize / PPTX export.
      this._spill.addEventListener('pointerdown', e => {
        if (e.button !== 0 || !this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        e.stopPropagation();
        this._spill.setPointerCapture(e.pointerId);
        const rect = this.getBoundingClientRect();
        const fw = rect.width || 1,
          fh = rect.height || 1;
        const corner = e.target.getAttribute && e.target.getAttribute('data-c');
        let move;
        if (corner) {
          // Resize about the OPPOSITE corner. Viewport-px throughout (rect
          // fw/fh, not clientWidth) so the math survives a transform:scale()
          // ancestor — deck_stage renders slides scaled-to-fit.
          const iw = this._img.naturalWidth || 1,
            ih = this._img.naturalHeight || 1;
          const base = Math.max(fw / iw, fh / ih);
          const sx = corner.includes('e') ? 1 : -1;
          const sy = corner.includes('s') ? 1 : -1;
          const s0 = this._view.s;
          const w0 = iw * base * s0,
            h0 = ih * base * s0;
          const cx0 = (50 + this._view.x) / 100 * fw;
          const cy0 = (50 + this._view.y) / 100 * fh;
          const ox = cx0 - sx * w0 / 2,
            oy = cy0 - sy * h0 / 2;
          const diag0 = Math.hypot(w0, h0);
          const ux = sx * w0 / diag0,
            uy = sy * h0 / diag0;
          move = ev => {
            const proj = (ev.clientX - rect.left - ox) * ux + (ev.clientY - rect.top - oy) * uy;
            const s = clampS(s0 * proj / diag0);
            const d = diag0 * s / s0;
            this._view.s = s;
            this._view.x = (ox + ux * d / 2) / fw * 100 - 50;
            this._view.y = (oy + uy * d / 2) / fh * 100 - 50;
            this._clampView();
            this._applyView();
          };
        } else {
          this.setAttribute('data-panning', '');
          const start = {
            px: e.clientX,
            py: e.clientY,
            x: this._view.x,
            y: this._view.y
          };
          move = ev => {
            this._view.x = start.x + (ev.clientX - start.px) / fw * 100;
            this._view.y = start.y + (ev.clientY - start.py) / fh * 100;
            this._clampView();
            this._applyView();
          };
        }
        const up = () => {
          try {
            this._spill.releasePointerCapture(e.pointerId);
          } catch {}
          this._spill.removeEventListener('pointermove', move);
          this._spill.removeEventListener('pointerup', up);
          this._spill.removeEventListener('pointercancel', up);
          this.removeAttribute('data-panning');
          this._dragUp = null;
        };
        // Stashed so _exitReframe (Escape / outside-click mid-drag) can
        // tear the capture + listeners down synchronously.
        this._dragUp = up;
        this._spill.addEventListener('pointermove', move);
        this._spill.addEventListener('pointerup', up);
        this._spill.addEventListener('pointercancel', up);
      });
      // Wheel zoom stays available inside reframe mode as a trackpad nicety —
      // zooms toward the cursor (offset' = cursor·(1-k) + offset·k).
      this.addEventListener('wheel', e => {
        if (!this.hasAttribute('data-reframe')) return;
        e.preventDefault();
        const r = this.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width * 100 - 50;
        const cy = (e.clientY - r.top) / r.height * 100 - 50;
        const prev = this._view.s;
        const next = clampS(prev * Math.pow(1.0015, -e.deltaY));
        if (next === prev) return;
        const k = next / prev;
        this._view.s = next;
        this._view.x = cx * (1 - k) + this._view.x * k;
        this._view.y = cy * (1 - k) + this._view.y * k;
        this._clampView();
        this._applyView();
      }, {
        passive: false
      });
    }
    connectedCallback() {
      // Warn once per page — an id-less slot works for the session but
      // cannot persist, and two id-less slots would share nothing.
      if (!this.id && !ImageSlot._warned) {
        ImageSlot._warned = true;
        console.warn('<image-slot> without an id will not persist its dropped image.');
      }
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      subs.add(this._subFn);
      // width%/height% in _applyView encode the frame aspect at call time —
      // a host resize (responsive grid, pane divider) would stretch the
      // image until the next _render. Re-render on size change: _render()
      // re-seeds _view from stored before clamp/apply, so a shrink→grow
      // cycle round-trips instead of ratcheting x/y toward the narrower
      // frame's clamp range.
      this._ro = new ResizeObserver(() => this._render());
      this._ro.observe(this);
      load();
      this._render();
    }
    disconnectedCallback() {
      subs.delete(this._subFn);
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
      if (this._ro) {
        this._ro.disconnect();
        this._ro = null;
      }
      this._exitReframe(false);
    }
    _enterReframe() {
      if (this.hasAttribute('data-reframe')) return;
      this.setAttribute('data-reframe', '');
      this._applyView();
      // Close on click outside (the spill handler stopPropagation()s so
      // in-image drags don't reach this) and on Escape. Listeners are held
      // on the instance so _exitReframe / disconnectedCallback can detach
      // exactly what was attached.
      this._outside = e => {
        if (e.composedPath && e.composedPath().includes(this)) return;
        this._exitReframe(true);
      };
      this._esc = e => {
        if (e.key === 'Escape') this._exitReframe(true);
      };
      document.addEventListener('pointerdown', this._outside, true);
      document.addEventListener('keydown', this._esc, true);
    }
    _exitReframe(commit) {
      if (!this.hasAttribute('data-reframe')) return;
      if (this._dragUp) this._dragUp();
      this.removeAttribute('data-reframe');
      this.removeAttribute('data-panning');
      if (this._outside) document.removeEventListener('pointerdown', this._outside, true);
      if (this._esc) document.removeEventListener('keydown', this._esc, true);
      this._outside = this._esc = null;
      if (commit) this._commitView();
    }
    attributeChangedCallback() {
      if (this.shadowRoot) this._render();
    }

    // handleEvent — one listener object for all four drag events keeps the
    // add/remove symmetric and the depth counter correct.
    handleEvent(e) {
      if (e.type === 'dragenter' || e.type === 'dragover') {
        // Without preventDefault the browser never fires 'drop'.
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        // dragenter/leave fire for every descendant crossing — count depth
        // so hovering the icon inside the empty state doesn't flicker.
        if (--this._depth <= 0) {
          this._depth = 0;
          this.removeAttribute('data-over');
        }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }
    async _ingest(file) {
      this._setError(null);
      if (!file || ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP, or AVIF image.');
        return;
      }
      // toDataUrl can take hundreds of ms on a large photo. A Clear or a
      // newer drop during that window would be clobbered when this await
      // resumes — bump + capture a generation so stale encodes bail.
      const gen = ++this._gen;
      try {
        const w = this.clientWidth || this.offsetWidth || MAX_DIM;
        const url = await toDataUrl(file, w);
        if (gen !== this._gen) return;
        // Only exit reframe once the new image is in hand — a rejected type
        // or decode failure leaves the in-progress crop untouched.
        this._exitReframe(false);
        const val = {
          u: url,
          s: 1,
          x: 0,
          y: 0
        };
        setSlot(this.id || '', val);
        // Keep a session-local copy for id-less slots so the drop still
        // shows, even though it cannot persist.
        if (!this.id) {
          this._local = val;
          this._render();
        }
      } catch (err) {
        if (gen !== this._gen) return;
        this._setError('Could not read that image.');
        console.warn('<image-slot> ingest failed:', err);
      }
    }
    _setError(msg) {
      if (this._err) {
        this._err.remove();
        this._err = null;
      }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => {
        if (this._err === d) {
          d.remove();
          this._err = null;
        }
      }, 3000);
    }

    // Reframing (pan/resize) is only meaningful for fit=cover — contain/fill
    // keep the old object-fit path and double-click is a no-op.
    _reframes() {
      return this.hasAttribute('data-filled') && (this.getAttribute('fit') || 'cover') === 'cover';
    }

    // Cover-baseline geometry, shared by clamp/apply/resize. Null until the
    // img has loaded (naturalWidth is 0 before that) or when the slot has no
    // layout box — ResizeObserver fires with a 0×0 rect under display:none,
    // and clamping against a degenerate 1×1 frame would silently pull the
    // stored pan toward zero.
    _geom() {
      const iw = this._img.naturalWidth,
        ih = this._img.naturalHeight;
      const fw = this.clientWidth,
        fh = this.clientHeight;
      if (!iw || !ih || !fw || !fh) return null;
      return {
        iw,
        ih,
        fw,
        fh,
        base: Math.max(fw / iw, fh / ih)
      };
    }
    _clampView() {
      // Pan range on each axis is half the overflow past the frame edge.
      const g = this._geom();
      if (!g) return;
      const mx = Math.max(0, (g.iw * g.base * this._view.s / g.fw - 1) * 50);
      const my = Math.max(0, (g.ih * g.base * this._view.s / g.fh - 1) * 50);
      this._view.x = Math.max(-mx, Math.min(mx, this._view.x));
      this._view.y = Math.max(-my, Math.min(my, this._view.y));
    }
    _applyView() {
      const g = this._geom();
      const fit = this.getAttribute('fit') || 'cover';
      if (fit !== 'cover' || !g) {
        // Non-cover, or dimensions not known yet (before img load).
        this._img.style.width = '100%';
        this._img.style.height = '100%';
        this._img.style.left = '50%';
        this._img.style.top = '50%';
        this._img.style.objectFit = fit;
        this._img.style.objectPosition = this.getAttribute('position') || '50% 50%';
        return;
      }
      // Cover baseline: img fills the frame on its tighter axis at s=1, so
      // pan works immediately on the overflowing axis without zooming first.
      // Width/height and left/top are all frame-% — depends only on the
      // frame aspect ratio, so a responsive resize keeps the same crop. The
      // spill layer mirrors the same box so its corners = image corners.
      const k = g.base * this._view.s;
      const w = g.iw * k / g.fw * 100 + '%';
      const h = g.ih * k / g.fh * 100 + '%';
      const l = 50 + this._view.x + '%';
      const t = 50 + this._view.y + '%';
      this._img.style.width = w;
      this._img.style.height = h;
      this._img.style.left = l;
      this._img.style.top = t;
      this._img.style.objectFit = '';
      this._spill.style.width = w;
      this._spill.style.height = h;
      this._spill.style.left = l;
      this._spill.style.top = t;
    }
    _commitView() {
      const v = {
        s: this._view.s,
        x: this._view.x,
        y: this._view.y
      };
      if (this._userUrl) v.u = this._userUrl;
      // Framing-only (no u) persists too so an author-src slot remembers its
      // crop; clearing the sidecar still falls through to src=.
      if (this.id) setSlot(this.id, v);else {
        this._local = v;
      }
    }
    _render() {
      // Shape / mask. Presets use border-radius so the dashed ring can
      // follow the rounded outline; clip-path is only applied for an
      // explicit `mask` (the ring is hidden there since a rectangle
      // dashed border chopped by an arbitrary polygon looks broken).
      const mask = this.getAttribute('mask');
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';else if (shape === 'pill') radius = '9999px';else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = mask ? '' : radius;
      this._frame.style.clipPath = mask || '';
      this._ring.style.borderRadius = mask ? '' : radius;
      this._ring.style.display = mask ? 'none' : '';

      // Controls and reframe entry gate on this so share links stay read-only.
      const editable = !!(window.omelette && window.omelette.writeFile);
      this.toggleAttribute('data-editable', editable);
      this._sub.style.display = editable ? '' : 'none';

      // Content. The sidecar is also writable by the agent's write_file
      // tool, so its value isn't guaranteed canvas-originated — only accept
      // data:image/ URLs from it. The `src` attribute is author-controlled
      // (Claude wrote it into the HTML) so it passes through unchanged.
      let stored = this.id ? getSlot(this.id) : this._local;
      if (stored && stored.u && !/^data:image\//i.test(stored.u)) stored = null;
      const srcAttr = this.getAttribute('src') || '';
      this._userUrl = stored && stored.u || null;
      const url = this._userUrl || srcAttr;
      // Don't clobber an in-flight reframe with a store-triggered re-render.
      if (!this.hasAttribute('data-reframe')) {
        this._view = {
          s: stored && Number.isFinite(stored.s) ? clampS(stored.s) : 1,
          x: stored && Number.isFinite(stored.x) ? stored.x : 0,
          y: stored && Number.isFinite(stored.y) ? stored.y : 0
        };
      }
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      // Toggle via style.display — the [hidden] attribute alone loses to
      // the display:flex / display:block rules in the stylesheet above.
      if (url) {
        if (this._img.getAttribute('src') !== url) {
          this._img.src = url;
          this._ghost.src = url;
        }
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
        this._clampView();
        this._applyView();
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._ghost.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }
  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/image-slot.js", error: String((e && e.message) || e) }); }

// ui_kits/instructor/screens.jsx
try { (() => {
// Instructor area screens. window.InstructorScreens = { Dashboard, Classes, Attendance, Payroll }
const {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  PageHeader,
  Field,
  Select,
  Input
} = window.DesignSystem_820aee;
const II = window.AHIcon;
const ils2 = n => "₪" + Number(n).toLocaleString("he-IL");
const MY_CLASSES = [{
  id: "1",
  title: "חוג שחייה לילדים",
  day: "שני",
  time: "16:30–17:15",
  students: 8,
  capacity: 12
}, {
  id: "2",
  title: "חוג שחייה מתקדמים",
  day: "רביעי",
  time: "17:30–18:30",
  students: 10,
  capacity: 10
}, {
  id: "3",
  title: "שחייה — קבוצת בוקר",
  day: "חמישי",
  time: "09:00–09:45",
  students: 6,
  capacity: 10
}];
const ROSTER = ["איתי לוי", "נועה אברהם", "עומר פרץ", "שירה כהן", "יואב מזרחי", "טליה ברק"];
function IDashboard({
  onNav
}) {
  const i = n => /*#__PURE__*/React.createElement(II, {
    name: n,
    size: 22
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05E9\u05DC\u05D5\u05DD \u05D3\u05E0\u05D4 \uD83D\uDC4B"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D4\u05E0\u05D4 \u05E1\u05E7\u05D9\u05E8\u05EA \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05E9\u05DC\u05DA \u05DC\u05D4\u05D9\u05D5\u05DD")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D4\u05D7\u05D5\u05D2\u05D9\u05DD \u05E9\u05DC\u05D9",
    value: 3,
    icon: i("waves"),
    tone: "brand"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD",
    value: 24,
    icon: i("child"),
    tone: "aqua"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05EA\u05E2\u05E8\u05D9\u05E3 \u05E9\u05E2\u05EA\u05D9",
    value: ils2(120),
    icon: i("money"),
    tone: "amber"
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05D4\u05D7\u05D5\u05D2\u05D9\u05DD \u05E9\u05DC\u05D9")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, MY_CLASSES.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderRadius: 16,
      border: "1px solid var(--ink-100)",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D9\u05D5\u05DD ", c.day, " \xB7 ", c.time, " \xB7 ", c.students, "/", c.capacity, " \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD")), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline",
    onClick: () => onNav("attendance")
  }, "\u05E1\u05D9\u05DE\u05D5\u05DF \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA")))))));
}
function IClasses({
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05D4\u05D7\u05D5\u05D2\u05D9\u05DD \u05E9\u05DC\u05D9",
    description: "\u05DB\u05DC \u05D4\u05D7\u05D5\u05D2\u05D9\u05DD \u05E9\u05D0\u05EA \u05DE\u05E2\u05D1\u05D9\u05E8\u05D4"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, MY_CLASSES.map(c => {
    const full = c.students >= c.capacity;
    return /*#__PURE__*/React.createElement(Card, {
      key: c.id
    }, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: "var(--font-display)",
        fontSize: 18,
        fontWeight: 700,
        color: "var(--ink-900)"
      }
    }, c.title), /*#__PURE__*/React.createElement(Badge, {
      tone: full ? "warning" : "success"
    }, full ? "מלא" : "פעיל")), /*#__PURE__*/React.createElement("div", {
      style: {
        margin: "16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 14,
        color: "var(--ink-600)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(II, {
      name: "calendar",
      size: 16
    }), "\u05D9\u05D5\u05DD ", c.day), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(II, {
      name: "clock",
      size: 16
    }), c.time), /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(II, {
      name: "users",
      size: 16
    }), c.students, "/", c.capacity, " \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD")), /*#__PURE__*/React.createElement(Button, {
      block: true,
      onClick: () => onNav("attendance")
    }, "\u05E1\u05D9\u05DE\u05D5\u05DF \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA")));
  })));
}
function IAttendance() {
  const OPTS = [{
    v: "present",
    label: "נוכח",
    bg: "var(--aqua-500)"
  }, {
    v: "late",
    label: "איחור",
    bg: "var(--amber-500)"
  }, {
    v: "absent",
    label: "נעדר",
    bg: "var(--red-500)"
  }];
  const [marks, setMarks] = React.useState({});
  const [saved, setSaved] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24,
      maxWidth: 720
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05E1\u05D9\u05DE\u05D5\u05DF \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA",
    description: "\u05D1\u05D7\u05E8\u05D5 \u05D7\u05D5\u05D2 \u05D5\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05E1\u05DE\u05E0\u05D5 \u05D0\u05EA \u05D4\u05E0\u05D5\u05DB\u05D7\u05D5\u05EA"
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u05D1\u05D7\u05D9\u05E8\u05EA \u05D7\u05D5\u05D2"
  }, /*#__PURE__*/React.createElement(Select, null, MY_CLASSES.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id
  }, c.title)))), /*#__PURE__*/React.createElement(Field, {
    label: "\u05EA\u05D0\u05E8\u05D9\u05DA"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    defaultValue: "2026-06-30"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, ROSTER.map(name => {
    const cur = marks[name] || "present";
    return /*#__PURE__*/React.createElement("div", {
      key: name,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderRadius: 14,
        border: "1px solid var(--ink-100)",
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500,
        color: "var(--ink-800)"
      }
    }, name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6
      }
    }, OPTS.map(o => {
      const on = cur === o.v;
      return /*#__PURE__*/React.createElement("button", {
        key: o.v,
        onClick: () => {
          setMarks(m => ({
            ...m,
            [name]: o.v
          }));
          setSaved(false);
        },
        style: {
          borderRadius: 10,
          padding: "6px 14px",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          background: on ? o.bg : "var(--ink-100)",
          color: on ? "#fff" : "var(--ink-600)"
        }
      }, o.label);
    })));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => setSaved(true)
  }, "\u05E9\u05DE\u05D9\u05E8\u05EA \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA"), saved && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 500,
      color: "var(--aqua-600)"
    }
  }, /*#__PURE__*/React.createElement(II, {
    name: "check",
    size: 16
  }), " \u05D4\u05E0\u05D5\u05DB\u05D7\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D4"))))));
}
function IPayroll() {
  const i = n => /*#__PURE__*/React.createElement(II, {
    name: n,
    size: 22
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05E9\u05DB\u05E8 \u05D5\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA",
    description: "\u05E1\u05D9\u05DB\u05D5\u05DD \u05DE\u05E4\u05D2\u05E9\u05D9\u05DD \u05D5\u05D4\u05E2\u05E8\u05DB\u05EA \u05E9\u05DB\u05E8"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05EA\u05E2\u05E8\u05D9\u05E3 \u05E9\u05E2\u05EA\u05D9",
    value: ils2(120),
    icon: i("money"),
    tone: "brand"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05DE\u05E4\u05D2\u05E9\u05D9\u05DD \u05D4\u05D7\u05D5\u05D3\u05E9",
    value: 18,
    icon: i("calendar"),
    tone: "aqua"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D4\u05E2\u05E8\u05DB\u05EA \u05E9\u05DB\u05E8",
    value: ils2(2160),
    icon: i("wallet"),
    tone: "amber",
    hint: "\u05DC\u05E4\u05E0\u05D9 \u05DE\u05E1"
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05E4\u05D9\u05E8\u05D5\u05D8 \u05DC\u05E4\u05D9 \u05D7\u05D5\u05D2")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, MY_CLASSES.map((c, k) => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 0",
      borderTop: k ? "1px solid var(--ink-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D9\u05D5\u05DD ", c.day, " \xB7 ", c.time)), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, 6 - k, " \u05E8\u05D9\u05E9\u05D5\u05DE\u05D9 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA")))))));
}
window.InstructorScreens = {
  IDashboard,
  IClasses,
  IAttendance,
  IPayroll
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/instructor/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/parent/screens.jsx
try { (() => {
// Parent area screens. window.ParentScreens = { PDashboard, PChildren, PEnrollments, PPayments }
const {
  StatCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  PageHeader,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Avatar
} = window.DesignSystem_820aee;
const PI = window.AHIcon;
const ils3 = n => "₪" + Number(n).toLocaleString("he-IL");
const CHILDREN = [{
  name: "איתי לוי",
  age: 7,
  gender: "זכר",
  note: "שחיין מתחיל, אוהב מים"
}, {
  name: "נועה לוי",
  age: 5,
  gender: "נקבה",
  note: "קבוצת פעוטות"
}];
const P_ENROLL = [{
  activity: "חוג שחייה לילדים",
  child: "איתי לוי",
  type: "חוג",
  status: ["success", "פעיל"],
  pay: ["success", "שולם"],
  date: "12.03.26"
}, {
  activity: "אקווה-ג'ימנסטיקה",
  child: "נועה לוי",
  type: "חוג",
  status: ["warning", "ממתין"],
  pay: ["danger", "לא שולם"],
  date: "14.03.26"
}];
const P_PAY = [{
  desc: "חוג שחייה לילדים",
  amount: 280,
  method: "כרטיס אשראי",
  status: ["success", "שולם"],
  date: "12.03.26"
}, {
  desc: "אקווה-ג'ימנסטיקה",
  amount: 240,
  method: "—",
  status: ["danger", "לא שולם"],
  date: "14.03.26"
}];
const RECEIPTS = [{
  num: "1042",
  email: "michal@mail.com",
  amount: 280,
  date: "12.03.26"
}, {
  num: "0987",
  email: "michal@mail.com",
  amount: 350,
  date: "01.02.26"
}];
function PDashboard({
  onNav
}) {
  const i = n => /*#__PURE__*/React.createElement(PI, {
    name: n,
    size: 22
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05E9\u05DC\u05D5\u05DD \u05DE\u05D9\u05DB\u05DC \uD83D\uDC4B"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05E1\u05E7\u05D9\u05E8\u05EA \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05E9\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D9\u05DC\u05D3\u05D9\u05DD",
    value: 2,
    icon: i("child"),
    tone: "brand"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA",
    value: 2,
    icon: i("enroll"),
    tone: "aqua"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05E4\u05EA\u05D5\u05D7\u05D9\u05DD",
    value: 1,
    icon: i("card"),
    tone: "rose",
    hint: ils3(240) + " לתשלום"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E9\u05DC\u05D9"), /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("enrollments"),
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--brand-600)",
      cursor: "pointer"
    }
  }, "\u05D4\u05DB\u05DC \u2190")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: "none"
    }
  }, P_ENROLL.map((e, k) => /*#__PURE__*/React.createElement("li", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "12px 0",
      borderTop: k ? "1px solid var(--ink-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, e.activity), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, e.child)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: e.pay[0]
  }, e.pay[1]), /*#__PURE__*/React.createElement(Badge, {
    tone: e.status[0]
  }, e.status[1]))))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, "\u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9"), /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("children"),
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--brand-600)",
      cursor: "pointer"
    }
  }, "\u05E0\u05D4\u05DC \u2190")), /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, CHILDREN.map((c, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, c.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: "var(--ink-500)"
    }
  }, "\u05D2\u05D9\u05DC ", c.age, " \xB7 ", c.gender)))))))));
}
function PChildren() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9",
    description: "\u05E0\u05D9\u05D4\u05D5\u05DC \u05E4\u05E8\u05D8\u05D9 \u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05D4\u05E8\u05E9\u05D5\u05DE\u05D9\u05DD",
    action: /*#__PURE__*/React.createElement(Button, null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(PI, {
      name: "plus",
      size: 16
    }), "\u05D4\u05D5\u05E1\u05E4\u05EA \u05D9\u05DC\u05D3"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 16
    }
  }, CHILDREN.map((c, k) => /*#__PURE__*/React.createElement(Card, {
    key: k
  }, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: c.name,
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, c.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D2\u05D9\u05DC ", c.age, " \xB7 ", c.gender))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "16px 0 0",
      fontSize: 14,
      color: "var(--ink-600)"
    }
  }, c.note), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "outline"
  }, "\u05E2\u05E8\u05D9\u05DB\u05D4"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost"
  }, "\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA"))))), /*#__PURE__*/React.createElement("a", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: 8,
      borderRadius: 20,
      border: "1px dashed var(--ink-200)",
      background: "rgba(246,247,249,0.5)",
      minHeight: 180,
      cursor: "pointer",
      color: "var(--brand-600)"
    }
  }, /*#__PURE__*/React.createElement(PI, {
    name: "plus",
    size: 28
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "\u05D4\u05D5\u05E1\u05E4\u05EA \u05D9\u05DC\u05D3"))));
}
function PEnrollments() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E9\u05DC\u05D9",
    description: "\u05DB\u05DC \u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05E9\u05DC \u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05E9\u05DC\u05DA"
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement(TH, null, "\u05D9\u05DC\u05D3"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D5\u05D2"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D8\u05D8\u05D5\u05E1"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05E9\u05DC\u05D5\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA"))), /*#__PURE__*/React.createElement(TBody, null, P_ENROLL.map((e, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, e.activity), /*#__PURE__*/React.createElement(TD, null, e.child), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, e.type)), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: e.status[0]
  }, e.status[1])), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: e.pay[0]
  }, e.pay[1])), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, e.date)))))));
}
function PPayments() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05E7\u05D1\u05DC\u05D5\u05EA",
    description: "\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u05D5\u05D4\u05D5\u05E8\u05D3\u05EA \u05E7\u05D1\u05DC\u05D5\u05EA"
  }), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px",
      borderBottom: "1px solid var(--ink-100)",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, "\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD"), /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D9\u05D0\u05D5\u05E8"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05DB\u05D5\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05D0\u05DE\u05E6\u05E2\u05D9"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05D8\u05D8\u05D5\u05E1"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA"), /*#__PURE__*/React.createElement(TH, null))), /*#__PURE__*/React.createElement(TBody, null, P_PAY.map((p, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, p.desc), /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600
    }
  }, ils3(p.amount)), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, p.method), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement(Badge, {
    tone: p.status[0]
  }, p.status[1])), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, p.date), /*#__PURE__*/React.createElement(TD, null, p.status[1] === "לא שולם" ? /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "\u05DC\u05EA\u05E9\u05DC\u05D5\u05DD") : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--ink-400)"
    }
  }, "\u2014"))))))), /*#__PURE__*/React.createElement(Card, {
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px",
      borderBottom: "1px solid var(--ink-100)",
      fontFamily: "var(--font-display)",
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, "\u05E7\u05D1\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement(Table, null, /*#__PURE__*/React.createElement(THead, null, /*#__PURE__*/React.createElement(TR, null, /*#__PURE__*/React.createElement(TH, null, "\u05DE\u05E1\u05E4\u05E8 \u05E7\u05D1\u05DC\u05D4"), /*#__PURE__*/React.createElement(TH, null, "\u05E0\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC"), /*#__PURE__*/React.createElement(TH, null, "\u05E1\u05DB\u05D5\u05DD"), /*#__PURE__*/React.createElement(TH, null, "\u05EA\u05D0\u05E8\u05D9\u05DA"), /*#__PURE__*/React.createElement(TH, null))), /*#__PURE__*/React.createElement(TBody, null, RECEIPTS.map((r, k) => /*#__PURE__*/React.createElement(TR, {
    key: k
  }, /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, "#", r.num), /*#__PURE__*/React.createElement(TD, {
    dir: "ltr",
    style: {
      textAlign: "right",
      color: "var(--ink-600)"
    }
  }, r.email), /*#__PURE__*/React.createElement(TD, {
    style: {
      fontWeight: 500
    }
  }, ils3(r.amount)), /*#__PURE__*/React.createElement(TD, {
    style: {
      color: "var(--ink-600)"
    }
  }, r.date), /*#__PURE__*/React.createElement(TD, null, /*#__PURE__*/React.createElement("a", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--brand-600)",
      cursor: "pointer"
    }
  }, "\u05D4\u05D5\u05E8\u05D3\u05D4"))))))));
}
window.ParentScreens = {
  PDashboard,
  PChildren,
  PEnrollments,
  PPayments
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/parent/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/public/PublicChrome.jsx
try { (() => {
// Public site chrome — sticky header + 4-column footer. Exposes window.PublicHeader / PublicFooter.
const {
  BrandLogo,
  Button
} = window.DesignSystem_820aee;
const Icon = window.AHIcon;
function PublicHeader({
  active,
  onNav,
  logoSrc
}) {
  const nav = [{
    key: "home",
    label: "בית"
  }, {
    key: "classes",
    label: "חוגים"
  }, {
    key: "programs",
    label: "מסלולים"
  }, {
    key: "contact",
    label: "צור קשר"
  }];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      borderBottom: "1px solid var(--ink-100)",
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(8px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      height: 64,
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 46
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4
    }
  }, nav.map(n => /*#__PURE__*/React.createElement("a", {
    key: n.key,
    onClick: () => onNav(n.key === "contact" ? "home" : n.key),
    style: {
      cursor: "pointer",
      borderRadius: 8,
      padding: "8px 14px",
      fontSize: 14,
      fontWeight: 500,
      color: active === n.key ? "var(--brand-700)" : "var(--ink-600)",
      background: active === n.key ? "var(--brand-50)" : "transparent"
    }
  }, n.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("login"),
    style: {
      cursor: "pointer",
      borderRadius: 12,
      padding: "8px 16px",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-700)"
    }
  }, "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA"), /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--sm",
    onClick: () => onNav("register")
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4"))));
}
function PublicFooter({
  logoSrc,
  onNav
}) {
  const d = window.AH_DATA.brand;
  const col = {
    display: "flex",
    flexDirection: "column",
    gap: 10
  };
  const h = {
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--ink-800)",
    margin: "0 0 4px"
  };
  const li = {
    fontSize: 14,
    color: "var(--ink-500)",
    cursor: "pointer"
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 64,
      borderTop: "1px solid var(--ink-100)",
      background: "var(--white)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "48px 24px",
      display: "grid",
      gap: 32,
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 42
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, d.tagline)), /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement("h4", {
    style: h
  }, "\u05E0\u05D9\u05D5\u05D5\u05D8"), /*#__PURE__*/React.createElement("span", {
    style: li,
    onClick: () => onNav("home")
  }, "\u05D1\u05D9\u05EA"), /*#__PURE__*/React.createElement("span", {
    style: li,
    onClick: () => onNav("classes")
  }, "\u05D7\u05D5\u05D2\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", {
    style: li,
    onClick: () => onNav("register")
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4"), /*#__PURE__*/React.createElement("span", {
    style: li,
    onClick: () => onNav("login")
  }, "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA")), /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement("h4", {
    style: h
  }, "\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D8\u05DC\u05E4\u05D5\u05DF: ", d.phone), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D3\u05D5\u05D0\u05F4\u05DC: ", d.email)), /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement("h4", {
    style: h
  }, "\u05E9\u05E2\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D0\u05F3\u2013\u05D4\u05F3: 08:00\u201321:00"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D5\u05F3: 08:00\u201314:00"))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--ink-100)",
      padding: "18px 0",
      textAlign: "center",
      fontSize: 12,
      color: "var(--ink-400)"
    }
  }, "\xA9 2026 ", d.name, ". \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA."));
}
Object.assign(window, {
  PublicHeader,
  PublicFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/public/PublicChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/public/data.js
try { (() => {
// Demo data for the על הגובה UI kits (Hebrew). Mirrors the spec's demo set.
window.AH_DATA = {
  brand: {
    name: "על הגובה",
    tagline: "חוגים, מסלולים וכניסות לבריכה",
    phone: "03-5556677",
    email: "info@al-hagova.co.il"
  },
  classes: [{
    id: "1",
    title: "חוג שחייה לילדים",
    category: "שחייה",
    level: "מתחילים",
    description: "קבוצות קטנות, מדריכות מוסמכות ויחס אישי לכל ילד. בניית ביטחון במים בקצב שלכם.",
    instructor: "דנה כהן",
    day: "שני",
    time: "16:30",
    endTime: "17:15",
    ageMin: 5,
    ageMax: 9,
    capacity: 12,
    taken: 8,
    available: 4,
    price: 280,
    status: "active"
  }, {
    id: "2",
    title: "חוג שחייה מתקדמים",
    category: "שחייה",
    level: "מתקדמים",
    description: "שיפור סגנונות, סבולת וטכניקה לשחיינים מנוסים.",
    instructor: "דנה כהן",
    day: "רביעי",
    time: "17:30",
    endTime: "18:30",
    ageMin: 9,
    ageMax: 14,
    capacity: 10,
    taken: 10,
    available: 0,
    price: 320,
    status: "full"
  }, {
    id: "3",
    title: "אקווה-ג'ימנסטיקה לפעוטות",
    category: "פעוטות",
    level: "התחלתי",
    description: "פעילות מים חווייתית להורה ופעוט, לפיתוח מוטורי ותחושת ביטחון.",
    instructor: "יעל אברהם",
    day: "ראשון",
    time: "09:00",
    endTime: "09:45",
    ageMin: 1,
    ageMax: 3,
    capacity: 8,
    taken: 3,
    available: 5,
    price: 240,
    status: "active"
  }],
  programs: [{
    id: "p1",
    title: "מנוי חודשי — שחייה חופשית",
    description: "כניסה חופשית לבריכה בכל ימות החודש",
    price: 350
  }, {
    id: "p2",
    title: "מנוי משפחתי — 3 חודשים",
    description: "עד 4 בני משפחה, שחייה חופשית",
    price: 900
  }],
  poolPasses: [{
    id: "k1",
    title: "כניסה חד-פעמית",
    description: "כניסה בודדת לבריכה",
    price: 45
  }, {
    id: "k2",
    title: "כרטיסייה — 10 כניסות",
    description: "10 כניסות בתוקף לשנה",
    price: 400
  }],
  features: [{
    icon: "shield",
    title: "בטיחות לפני הכל",
    desc: "מדריכות מוסמכות, יחס אישי וקבוצות קטנות."
  }, {
    icon: "phone",
    title: "הרשמה דיגיטלית",
    desc: "נרשמים, משלמים ומנהלים הכל אונליין, בעברית מלאה."
  }, {
    icon: "drop",
    title: "מגוון פעילויות",
    desc: "חוגי שחייה, מסלולים חודשיים וכניסות חופשיות לבריכה."
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/public/data.js", error: String((e && e.message) || e) }); }

// ui_kits/public/screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Public site screens. Exposes window.PublicScreens = { home, classes, detail, register, login }.
const {
  ClassCard,
  Button,
  Badge,
  BrandLogo,
  Card,
  Field,
  Input,
  Select
} = window.DesignSystem_820aee;
const Ic = window.AHIcon;
const D = window.AH_DATA;
const shekel = n => "₪" + Number(n).toLocaleString("he-IL");
const wrap = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 24px"
};
const MAG = "var(--logo-magenta)",
  CYN = "var(--logo-cyan)",
  ORG = "var(--logo-orange)";
function Orb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  blur = 60,
  opacity = 0.5
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top,
      left,
      right,
      bottom,
      width: size,
      height: size,
      borderRadius: "50%",
      background: color,
      filter: `blur(${blur}px)`,
      opacity,
      pointerEvents: "none"
    }
  });
}
function SectionHead({
  eyebrow,
  title,
  sub,
  link,
  onLink,
  color = "var(--brand-600)"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 32,
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color,
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 2,
      background: color,
      borderRadius: 2
    }
  }), eyebrow), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "10px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 34,
      fontWeight: 800,
      color: "var(--ink-900)",
      lineHeight: 1.1
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 0",
      color: "var(--ink-500)"
    }
  }, sub)), link && /*#__PURE__*/React.createElement("a", {
    onClick: onLink,
    style: {
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      color
    }
  }, link, " \u2190"));
}
function Hero({
  onNav
}) {
  const stats = [["1,200+", "ילדים מאושרים"], ["15+", "שנות ניסיון"], ["98%", "הורים ממליצים"]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(155deg, #06314f 0%, #0a4a71 44%, #0072b8 80%, #0c97cc 100%)"
    }
  }, /*#__PURE__*/React.createElement(Orb, {
    color: MAG,
    size: 420,
    top: -120,
    left: -80,
    blur: 90,
    opacity: 0.35
  }), /*#__PURE__*/React.createElement(Orb, {
    color: CYN,
    size: 360,
    bottom: -40,
    right: -60,
    blur: 90,
    opacity: 0.4
  }), /*#__PURE__*/React.createElement(Orb, {
    color: ORG,
    size: 160,
    top: 120,
    right: 420,
    blur: 50,
    opacity: 0.45
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0.18,
      backgroundImage: "radial-gradient(circle at 80% 0%, #fff, transparent 45%)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1.02fr 0.98fr",
      gap: 48,
      alignItems: "center",
      padding: "84px 24px 174px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      background: "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.18)",
      padding: "7px 16px",
      fontSize: 13,
      fontWeight: 600,
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: ORG
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "waves",
    size: 16
  })), " \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05DC\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D5\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05DE\u05D9\u05DD"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "22px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 72,
      fontWeight: 800,
      lineHeight: 0.98,
      letterSpacing: "-0.02em"
    }
  }, D.brand.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 27,
      fontWeight: 700,
      lineHeight: 1.25,
      background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent"
    }
  }, "\u05E9\u05D7\u05D9\u05D9\u05D4, \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05D5\u05D4\u05E0\u05D0\u05D4", /*#__PURE__*/React.createElement("br", null), "\u05D1\u05D2\u05D5\u05D1\u05D4 \u05D4\u05E2\u05D9\u05E0\u05D9\u05D9\u05DD"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "20px 0 0",
      maxWidth: 480,
      fontSize: 17,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.85)"
    }
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4 \u05DC\u05D7\u05D5\u05D2\u05D9\u05DD, \u05DE\u05E1\u05DC\u05D5\u05DC\u05D9\u05DD \u05D5\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA \u05DC\u05D1\u05E8\u05D9\u05DB\u05D4 \u05D1\u05DB\u05DE\u05D4 \u05E7\u05DC\u05D9\u05E7\u05D9\u05DD. \u05E0\u05D9\u05D4\u05D5\u05DC \u05D4\u05D9\u05DC\u05D3\u05D9\u05DD, \u05D4\u05D4\u05E8\u05E9\u05DE\u05D5\u05EA \u05D5\u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD \u2014 \u05D4\u05DB\u05DC \u05D1\u05DE\u05E7\u05D5\u05DD \u05D0\u05D7\u05D3."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 30,
      display: "flex",
      flexWrap: "wrap",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg",
    onClick: () => onNav("register")
  }, "\u05E4\u05EA\u05D9\u05D7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-glass ah-btn ah-btn--lg",
    onClick: () => onNav("classes")
  }, "\u05DC\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D7\u05D5\u05D2\u05D9\u05DD")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 36,
      display: "flex",
      alignItems: "center",
      gap: 24
    }
  }, stats.map(([b, s], i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 34,
      background: "rgba(255,255,255,0.22)"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 800,
      color: "#fff"
    }
  }, b), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 12.5,
      color: "rgba(255,255,255,0.7)"
    }
  }, s)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: "-18px -18px auto auto",
      width: 132,
      height: 132,
      borderRadius: "50%",
      border: "10px solid " + ORG,
      opacity: 0.9,
      zIndex: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      insetInlineStart: -36,
      bottom: 70,
      width: 120,
      height: 120,
      borderRadius: "50%",
      background: MAG,
      opacity: 0.25,
      filter: "blur(6px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      borderRadius: 32,
      padding: 10,
      background: "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.22)",
      backdropFilter: "blur(6px)",
      boxShadow: "0 30px 70px -30px rgba(0,0,0,0.6)"
    }
  }, /*#__PURE__*/React.createElement("image-slot", {
    id: "public-hero",
    placeholder: "\u05D2\u05E8\u05E8\u05D5 \u05DC\u05DB\u05D0\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4 \u05E9\u05DC \u05D4\u05D1\u05E8\u05D9\u05DB\u05D4",
    shape: "rounded",
    radius: "24",
    style: {
      display: "block",
      width: "100%",
      height: 470
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      insetInlineEnd: 24,
      bottom: -26,
      zIndex: 3,
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      background: "#fff",
      padding: "12px 16px",
      boxShadow: "0 18px 40px -16px rgba(16,42,75,0.45)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      background: "var(--aqua-100)",
      color: "var(--aqua-600)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "shield",
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "98% \u05D4\u05D5\u05E8\u05D9\u05DD \u05DE\u05DE\u05DC\u05D9\u05E6\u05D9\u05DD"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: "var(--ink-500)"
    }
  }, "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D5\u05EA \u05DE\u05D5\u05E1\u05DE\u05DB\u05D5\u05EA \xB7 \u05D9\u05D7\u05E1 \u05D0\u05D9\u05E9\u05D9"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      insetInline: 0,
      bottom: -1,
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1440 110",
    preserveAspectRatio: "none",
    style: {
      display: "block",
      width: "100%",
      height: 90
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z",
    fill: "var(--ink-50)"
  }))));
}
function Features() {
  const accents = [CYN, MAG, ORG];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "0 24px",
      marginTop: -112,
      position: "relative",
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 20
    }
  }, D.features.map((f, i) => {
    const a = accents[i % 3];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "feat-card",
      style: {
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        background: "#fff",
        padding: 26,
        boxShadow: "var(--shadow-card)",
        border: "1px solid var(--ink-100)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        insetInline: 0,
        top: 0,
        height: 4,
        background: a
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        color: "#fff",
        background: a,
        boxShadow: `0 12px 26px -10px ${a}`
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: f.icon,
      size: 24
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: "18px 0 0",
        fontFamily: "var(--font-display)",
        fontSize: 19,
        fontWeight: 800,
        color: "var(--ink-900)"
      }
    }, f.title), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: "6px 0 0",
        fontSize: 14.5,
        lineHeight: 1.55,
        color: "var(--ink-500)"
      }
    }, f.desc));
  })));
}
function PriceRow({
  title,
  desc,
  price
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      borderRadius: 20,
      border: "1px solid var(--ink-100)",
      background: "var(--white)",
      padding: 16,
      boxShadow: "var(--shadow-card)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, title), desc && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "2px 0 0",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, desc)), /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      fontFamily: "var(--font-display)",
      fontSize: 18,
      fontWeight: 800,
      color: "var(--brand-700)"
    }
  }, shekel(price)));
}
function HomeScreen({
  onNav,
  onOpenClass
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Hero, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(Features, null), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "56px 24px 8px"
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "\u05D4\u05D7\u05D5\u05D2\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5",
    title: "\u05D7\u05D5\u05D2\u05D9\u05DD \u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD",
    sub: "\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05DC\u05D7\u05D5\u05D2\u05D9\u05DD \u05D4\u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9\u05D9\u05DD \u05E9\u05DC\u05E0\u05D5",
    link: "\u05DC\u05DB\u05DC \u05D4\u05D7\u05D5\u05D2\u05D9\u05DD",
    onLink: () => onNav("classes")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24
    }
  }, D.classes.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => onOpenClass(c.id),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(ClassCard, c))))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "64px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color: MAG,
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 2,
      background: MAG,
      borderRadius: 2
    }
  }), "\u05DE\u05E0\u05D5\u05D9\u05D9\u05DD"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "10px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05DE\u05E1\u05DC\u05D5\u05DC\u05D9\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9\u05D9\u05DD"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, D.programs.map(p => /*#__PURE__*/React.createElement(PriceRow, _extends({
    key: p.id
  }, p))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.04em",
      color: CYN,
      textTransform: "uppercase"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 22,
      height: 2,
      background: CYN,
      borderRadius: 2
    }
  }), "\u05D2\u05DE\u05D9\u05E9"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "10px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA \u05DC\u05D1\u05E8\u05D9\u05DB\u05D4"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, D.poolPasses.map(p => /*#__PURE__*/React.createElement(PriceRow, _extends({
    key: p.id
  }, p))))))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      paddingBottom: 72
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 32,
      background: "linear-gradient(120deg, #0a4a71 0%, #0072b8 60%, #0c97cc 100%)",
      padding: "56px 32px",
      textAlign: "center",
      color: "#fff",
      boxShadow: "0 30px 60px -28px rgba(10,74,113,0.6)"
    }
  }, /*#__PURE__*/React.createElement(Orb, {
    color: MAG,
    size: 260,
    top: -90,
    right: -40,
    blur: 70,
    opacity: 0.4
  }), /*#__PURE__*/React.createElement(Orb, {
    color: ORG,
    size: 150,
    bottom: -50,
    left: 60,
    blur: 50,
    opacity: 0.5
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.22)",
      padding: "6px 16px",
      fontSize: 13,
      fontWeight: 600,
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: ORG
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "drop",
    size: 15
  })), " \u05D4\u05E6\u05D8\u05E8\u05E4\u05D5 \u05D0\u05DC\u05D9\u05E0\u05D5"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "16px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 40,
      fontWeight: 800,
      letterSpacing: "-0.01em"
    }
  }, "\u05DE\u05D5\u05DB\u05E0\u05D9\u05DD \u05DC\u05E7\u05E4\u05D5\u05E5 \u05DC\u05DE\u05D9\u05DD?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px auto 0",
      maxWidth: 560,
      fontSize: 17,
      color: "rgba(255,255,255,0.88)"
    }
  }, "\u05E4\u05EA\u05D7\u05D5 \u05D7\u05E9\u05D1\u05D5\u05DF, \u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05D0\u05EA \u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD \u05D5\u05D4\u05D9\u05E8\u05E9\u05DE\u05D5 \u05DC\u05D7\u05D5\u05D2 \u05D4\u05DE\u05EA\u05D0\u05D9\u05DD \u05EA\u05D5\u05DA \u05D3\u05E7\u05D5\u05EA."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28,
      display: "flex",
      justifyContent: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg",
    onClick: () => onNav("register")
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4 \u05E2\u05DB\u05E9\u05D9\u05D5 \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-glass ah-btn ah-btn--lg",
    onClick: () => onNav("classes")
  }, "\u05E2\u05D9\u05D5\u05DF \u05D1\u05D7\u05D5\u05D2\u05D9\u05DD"))))));
}
function ClassesScreen({
  onOpenClass
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: "40px 24px 24px"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05DB\u05DC \u05D4\u05D7\u05D5\u05D2\u05D9\u05DD"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 28px",
      color: "var(--ink-500)"
    }
  }, D.classes.length, " \u05D7\u05D5\u05D2\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \xB7 \u05D1\u05D7\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DB\u05DD"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24
    }
  }, D.classes.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => onOpenClass(c.id),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(ClassCard, c)))));
}
function DetailRow({
  icon,
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderRadius: 20,
      border: "1px solid var(--ink-100)",
      background: "var(--white)",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--brand-600)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: "var(--ink-400)"
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontWeight: 600,
      color: "var(--ink-900)"
    }
  }, value)));
}
function DetailScreen({
  id,
  onNav
}) {
  const c = D.classes.find(x => x.id === id) || D.classes[0];
  const soldOut = c.available <= 0 || c.status === "full";
  const pct = Math.min(100, c.taken / Math.max(c.capacity, 1) * 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--ink-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: "24px 24px 8px"
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("classes"),
    style: {
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--ink-500)"
    }
  }, "\u2192 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05DB\u05DC \u05D4\u05D7\u05D5\u05D2\u05D9\u05DD")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 32,
      paddingBottom: 64
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 360,
      borderRadius: 28,
      overflow: "hidden",
      background: "var(--brand-gradient)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "waves",
    size: 72,
    stroke: 1.4
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: soldOut ? "warning" : "success"
  }, soldOut ? "מלא" : "פעיל"), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, c.category), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "\u05E8\u05DE\u05D4: ", c.level)), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "16px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 30,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      lineHeight: 1.65,
      color: "var(--ink-600)"
    }
  }, c.description), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(DetailRow, {
    icon: "teacher",
    label: "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D4",
    value: c.instructor
  }), /*#__PURE__*/React.createElement(DetailRow, {
    icon: "calendar",
    label: "\u05D9\u05D5\u05DD \u05D1\u05E9\u05D1\u05D5\u05E2",
    value: "יום " + c.day
  }), /*#__PURE__*/React.createElement(DetailRow, {
    icon: "clock",
    label: "\u05E9\u05E2\u05D5\u05EA",
    value: c.time + "–" + c.endTime
  }), /*#__PURE__*/React.createElement(DetailRow, {
    icon: "age",
    label: "\u05D2\u05D9\u05DC\u05D0\u05D9\u05DD",
    value: "גילאי " + c.ageMin + "–" + c.ageMax
  }))), /*#__PURE__*/React.createElement("aside", {
    style: {
      alignSelf: "flex-start",
      position: "sticky",
      top: 88
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 28,
      border: "1px solid var(--ink-100)",
      background: "var(--white)",
      padding: 24,
      boxShadow: "var(--shadow-card)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05DE\u05D7\u05D9\u05E8 \u05D4\u05D7\u05D5\u05D2"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 36,
      fontWeight: 800,
      color: "var(--brand-700)"
    }
  }, shekel(c.price)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      borderRadius: 20,
      background: "var(--ink-50)",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-500)"
    }
  }, "\u05DE\u05E7\u05D5\u05DE\u05D5\u05EA \u05E4\u05E0\u05D5\u05D9\u05D9\u05DD"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: "var(--ink-900)"
    }
  }, soldOut ? "מלא" : c.available + " מתוך " + c.capacity)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      height: 8,
      borderRadius: 999,
      background: "var(--ink-200)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      borderRadius: 999,
      background: "var(--brand-gradient)",
      width: pct + "%"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20
    }
  }, soldOut ? /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    block: true,
    onClick: () => onNav("register")
  }, "\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA \u05DC\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4") : /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    block: true,
    onClick: () => onNav("register")
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4 \u05DC\u05D7\u05D5\u05D2"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      textAlign: "center",
      fontSize: 12,
      color: "var(--ink-400)"
    }
  }, "\u05D4\u05D4\u05E8\u05E9\u05DE\u05D4 \u05DE\u05EA\u05D1\u05E6\u05E2\u05EA \u05DC\u05D0\u05D7\u05E8 \u05E4\u05EA\u05D9\u05D7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u05D0\u05D9\u05E9\u05D9"))))));
}
function AuthBrandPanel({
  heading,
  points
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      color: "#fff",
      padding: "64px 56px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      minHeight: "100%",
      background: "linear-gradient(160deg, #06314f 0%, #0a4a71 50%, #0072b8 100%)"
    }
  }, /*#__PURE__*/React.createElement(Orb, {
    color: MAG,
    size: 360,
    top: -110,
    left: -70,
    blur: 90,
    opacity: 0.32
  }), /*#__PURE__*/React.createElement(Orb, {
    color: CYN,
    size: 320,
    bottom: -60,
    right: -60,
    blur: 90,
    opacity: 0.36
  }), /*#__PURE__*/React.createElement(Orb, {
    color: ORG,
    size: 140,
    top: 120,
    right: 90,
    blur: 50,
    opacity: 0.4
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: 440
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      background: "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.18)",
      padding: "7px 16px",
      fontSize: 13,
      fontWeight: 600,
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: ORG
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "waves",
    size: 16
  })), " \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05DC\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D5\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05DE\u05D9\u05DD"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: "22px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 52,
      fontWeight: 800,
      lineHeight: 0.98,
      letterSpacing: "-0.02em"
    }
  }, "\u05E2\u05DC \u05D4\u05D2\u05D5\u05D1\u05D4"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 700,
      lineHeight: 1.25,
      background: "linear-gradient(90deg, #ffd9ef, #aef0ff)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent"
    }
  }, heading), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "28px 0 0",
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, points.map((t, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      fontSize: 15.5,
      color: "rgba(255,255,255,0.92)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      display: "flex",
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      background: "rgba(255,255,255,0.16)"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 15
  })), t))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      borderRadius: 16,
      background: "rgba(255,255,255,0.1)",
      border: "1px solid rgba(255,255,255,0.16)",
      padding: "12px 16px",
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      background: "var(--logo-orange)",
      color: "#3a2400"
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "shield",
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 15,
      fontWeight: 800
    }
  }, "98% \u05D4\u05D5\u05E8\u05D9\u05DD \u05DE\u05DE\u05DC\u05D9\u05E6\u05D9\u05DD"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12.5,
      color: "rgba(255,255,255,0.72)"
    }
  }, "\u05DE\u05D3\u05E8\u05D9\u05DB\u05D5\u05EA \u05DE\u05D5\u05E1\u05DE\u05DB\u05D5\u05EA \xB7 \u05D9\u05D7\u05E1 \u05D0\u05D9\u05E9\u05D9")))));
}
function RegisterScreen({
  onNav,
  logoSrc
}) {
  const labelH3 = {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.03em",
    color: "var(--brand-600)",
    textTransform: "uppercase"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      minHeight: "calc(100vh - 64px)",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "56px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 440
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("home"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-500)",
      cursor: "pointer"
    }
  }, "\u2192 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA"), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav("home"),
    style: {
      cursor: "pointer",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 44
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "22px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 32,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05E4\u05EA\u05D9\u05D7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 28px",
      color: "var(--ink-500)"
    }
  }, "\u05D4\u05E8\u05E9\u05DE\u05D5 \u05D1\u05D7\u05D9\u05E0\u05DD \u05D5\u05E0\u05D4\u05DC\u05D5 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05E9\u05DC \u05D4\u05D9\u05DC\u05D3\u05D9\u05DD \u05D1\u05DE\u05E7\u05D5\u05DD \u05D0\u05D7\u05D3."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: labelH3
  }, "\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D5\u05E8\u05D4"), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E9\u05DD \u05DE\u05DC\u05D0",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u05DE\u05D9\u05DB\u05DC \u05DC\u05D5\u05D9"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05D8\u05DC\u05E4\u05D5\u05DF",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "tel",
    dir: "ltr",
    placeholder: "050-0000000"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    dir: "ltr",
    placeholder: "michal@mail.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E1\u05D9\u05E1\u05DE\u05D4",
    hint: "\u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16,
      borderTop: "1px solid var(--ink-100)",
      paddingTop: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: labelH3
  }, "\u05E4\u05E8\u05D8\u05D9 \u05D9\u05DC\u05D3 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      color: "var(--ink-400)",
      letterSpacing: 0,
      textTransform: "none"
    }
  }, "\xB7 \u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9")), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E9\u05DD \u05D4\u05D9\u05DC\u05D3"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u05D0\u05D9\u05EA\u05D9 \u05DC\u05D5\u05D9"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05DC\u05D9\u05D3\u05D4"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    dir: "ltr"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05DE\u05D9\u05DF"
  }, /*#__PURE__*/React.createElement(Select, null, /*#__PURE__*/React.createElement("option", null, "\u05D1\u05D7\u05E8\u05D5..."), /*#__PURE__*/React.createElement("option", null, "\u05D6\u05DB\u05E8"), /*#__PURE__*/React.createElement("option", null, "\u05E0\u05E7\u05D1\u05D4")))), /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg ah-btn--block",
    onClick: () => onNav("login")
  }, "\u05D9\u05E6\u05D9\u05E8\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      textAlign: "center",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05DB\u05D1\u05E8 \u05D9\u05E9 \u05DC\u05DB\u05DD \u05D7\u05E9\u05D1\u05D5\u05DF? ", /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("login"),
    style: {
      cursor: "pointer",
      fontWeight: 700,
      color: "var(--brand-600)"
    }
  }, "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA"))))), /*#__PURE__*/React.createElement(AuthBrandPanel, {
    heading: "\u05E9\u05D7\u05D9\u05D9\u05D4, \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05D5\u05D4\u05E0\u05D0\u05D4 \u2014 \u05D1\u05D2\u05D5\u05D1\u05D4 \u05D4\u05E2\u05D9\u05E0\u05D9\u05D9\u05DD",
    points: ["הרשמה לחוגים ותשלום מאובטח אונליין", "ניהול כל הילדים בפרופיל משפחתי אחד", "מעקב נוכחות וקבלות דיגיטליות", "התראות על פתיחת חוגים ורשימות המתנה"]
  }));
}
function LoginScreen({
  onNav,
  logoSrc
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      minHeight: "100vh",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 400
    }
  }, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("home"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ink-500)",
      cursor: "pointer"
    }
  }, "\u2192 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA"), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNav("home"),
    style: {
      cursor: "pointer",
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(BrandLogo, {
    src: logoSrc,
    height: 48
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "22px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 32,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05D1\u05E8\u05D5\u05DB\u05D9\u05DD \u05D4\u05E9\u05D1\u05D9\u05DD \uD83D\uDC4B"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "6px 0 28px",
      color: "var(--ink-500)"
    }
  }, "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05DC\u05D0\u05D6\u05D5\u05E8 \u05D4\u05D0\u05D9\u05E9\u05D9 \u05E9\u05DC\u05DB\u05DD"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    dir: "ltr",
    placeholder: "michal@mail.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "\u05E1\u05D9\u05E1\u05DE\u05D4",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: -4
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      fontSize: 13.5,
      color: "var(--ink-600)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    style: {
      accentColor: "var(--brand-600)",
      width: 15,
      height: 15
    }
  }), " \u05D6\u05DB\u05E8\u05D5 \u05D0\u05D5\u05EA\u05D9"), /*#__PURE__*/React.createElement("a", {
    style: {
      fontSize: 13.5,
      fontWeight: 600,
      color: "var(--brand-600)",
      cursor: "pointer"
    }
  }, "\u05E9\u05DB\u05D7\u05EA\u05DD \u05E1\u05D9\u05E1\u05DE\u05D4?")), /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg ah-btn--block",
    onClick: () => onNav("home")
  }, "\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05D7\u05E9\u05D1\u05D5\u05DF"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      textAlign: "center",
      fontSize: 14,
      color: "var(--ink-500)"
    }
  }, "\u05D0\u05D9\u05DF \u05DC\u05DB\u05DD \u05D7\u05E9\u05D1\u05D5\u05DF? ", /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("register"),
    style: {
      cursor: "pointer",
      fontWeight: 700,
      color: "var(--brand-600)"
    }
  }, "\u05D4\u05E8\u05E9\u05DE\u05D4"))))), /*#__PURE__*/React.createElement(AuthBrandPanel, {
    heading: "\u05E9\u05D7\u05D9\u05D9\u05D4, \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF \u05D5\u05D4\u05E0\u05D0\u05D4 \u2014 \u05D1\u05D2\u05D5\u05D1\u05D4 \u05D4\u05E2\u05D9\u05E0\u05D9\u05D9\u05DD",
    points: ["כל ההרשמות והתשלומים במקום אחד", "מעקב נוכחות וקבלות דיגיטליות", "עדכונים על חוגים חדשים ורשימות המתנה"]
  }));
}
function PlanCard({
  name,
  desc,
  price,
  period,
  features,
  icon,
  accent,
  featured,
  badge,
  onNav
}) {
  const base = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    borderRadius: 26,
    padding: 30,
    transition: "transform .25s ease, box-shadow .25s ease"
  };
  const checkCol = featured ? "rgba(255,255,255,0.95)" : accent;
  return /*#__PURE__*/React.createElement("div", {
    className: "feat-card",
    style: featured ? {
      ...base,
      color: "#fff",
      background: "linear-gradient(150deg, #0a4a71 0%, #0072b8 55%, #0c97cc 100%)",
      boxShadow: "0 26px 54px -24px rgba(10,74,113,0.6)",
      overflow: "hidden"
    } : {
      ...base,
      background: "#fff",
      border: "1px solid var(--ink-100)",
      boxShadow: "var(--shadow-card)"
    }
  }, featured && /*#__PURE__*/React.createElement(Orb, {
    color: MAG,
    size: 200,
    top: -80,
    left: -40,
    blur: 60,
    opacity: 0.45
  }), badge && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 18,
      insetInlineEnd: 18,
      borderRadius: 999,
      padding: "5px 12px",
      fontSize: 12,
      fontWeight: 800,
      background: featured ? "var(--logo-orange)" : "var(--brand-100)",
      color: featured ? "#3a2400" : "var(--brand-700)"
    }
  }, badge), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      background: featured ? "rgba(255,255,255,0.16)" : accent,
      color: "#fff",
      boxShadow: featured ? "none" : `0 12px 26px -10px ${accent}`
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: icon,
    size: 22
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "18px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 21,
      fontWeight: 800,
      color: featured ? "#fff" : "var(--ink-900)"
    }
  }, name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      fontSize: 14,
      lineHeight: 1.5,
      color: featured ? "rgba(255,255,255,0.82)" : "var(--ink-500)"
    }
  }, desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      margin: "20px 0 0"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 42,
      fontWeight: 800,
      color: featured ? "#fff" : "var(--brand-700)"
    }
  }, shekel(price)), period && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: featured ? "rgba(255,255,255,0.75)" : "var(--ink-400)"
    }
  }, period)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: featured ? "rgba(255,255,255,0.18)" : "var(--ink-100)",
      margin: "22px 0"
    }
  }), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, features.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      fontSize: 14.5,
      color: featured ? "rgba(255,255,255,0.92)" : "var(--ink-700)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      marginTop: 1,
      color: checkCol
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "check",
    size: 17
  })), f))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26
    }
  }, featured ? /*#__PURE__*/React.createElement("button", {
    className: "ah-btn ah-btn--lg ah-btn--block",
    style: {
      background: "#fff",
      color: "var(--brand-700)"
    },
    onClick: () => onNav("register")
  }, "\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA \u05DC\u05DE\u05E1\u05DC\u05D5\u05DC") : /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg ah-btn--block",
    onClick: () => onNav("register")
  }, "\u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA \u05DC\u05DE\u05E1\u05DC\u05D5\u05DC"))));
}
function ProgramsScreen({
  onNav
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(155deg, #06314f 0%, #0a4a71 48%, #0072b8 100%)"
    }
  }, /*#__PURE__*/React.createElement(Orb, {
    color: MAG,
    size: 340,
    top: -120,
    right: -60,
    blur: 90,
    opacity: 0.32
  }), /*#__PURE__*/React.createElement(Orb, {
    color: CYN,
    size: 300,
    bottom: -40,
    left: -50,
    blur: 90,
    opacity: 0.36
  }), /*#__PURE__*/React.createElement(Orb, {
    color: ORG,
    size: 130,
    top: 70,
    left: 360,
    blur: 50,
    opacity: 0.4
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      position: "relative",
      padding: "64px 24px 130px",
      textAlign: "center",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 999,
      background: "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.18)",
      padding: "7px 16px",
      fontSize: 13,
      fontWeight: 600,
      backdropFilter: "blur(6px)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: ORG
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "ticket",
    size: 16
  })), " \u05DE\u05D7\u05D9\u05E8\u05D5\u05DF \xB7 \u05DE\u05E1\u05DC\u05D5\u05DC\u05D9\u05DD \u05D5\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: "20px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 50,
      fontWeight: 800,
      letterSpacing: "-0.02em",
      lineHeight: 1.04
    }
  }, "\u05D1\u05D7\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05E9\u05DC\u05DB\u05DD"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "14px auto 0",
      maxWidth: 560,
      fontSize: 17,
      lineHeight: 1.6,
      color: "rgba(255,255,255,0.85)"
    }
  }, "\u05DE\u05E0\u05D5\u05D9\u05D9\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9\u05D9\u05DD \u05DC\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D7\u05D5\u05E4\u05E9\u05D9\u05EA \u05D5\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA \u05D2\u05DE\u05D9\u05E9\u05D5\u05EA \u05DC\u05D1\u05E8\u05D9\u05DB\u05D4 \u2014 \u05D1\u05DC\u05D9 \u05D4\u05EA\u05D7\u05D9\u05D9\u05D1\u05D5\u05EA, \u05D1\u05DC\u05D9 \u05D1\u05D9\u05E8\u05D5\u05E7\u05E8\u05D8\u05D9\u05D4. \u05D1\u05D7\u05E8\u05D5, \u05E9\u05DC\u05DE\u05D5 \u05D5\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05DC\u05E9\u05D7\u05D5\u05EA.")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      insetInline: 0,
      bottom: -1,
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1440 110",
    preserveAspectRatio: "none",
    style: {
      display: "block",
      width: "100%",
      height: 90
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,40 C240,110 480,110 720,70 C960,30 1200,20 1440,60 L1440,110 L0,110 Z",
    fill: "var(--ink-50)"
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "32px 24px 0",
      marginTop: 0,
      position: "relative",
      zIndex: 3
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "\u05DE\u05E0\u05D5\u05D9\u05D9\u05DD",
    title: "\u05DE\u05E1\u05DC\u05D5\u05DC\u05D9\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9\u05D9\u05DD",
    sub: "\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D7\u05D5\u05E4\u05E9\u05D9\u05EA, \u05DB\u05DE\u05D4 \u05E9\u05D1\u05D0 \u05DC\u05DB\u05DD",
    color: MAG
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement(PlanCard, {
    onNav: onNav,
    icon: "drop",
    accent: CYN,
    name: "\u05DE\u05E0\u05D5\u05D9 \u05D7\u05D5\u05D3\u05E9\u05D9",
    period: "/ \u05DC\u05D7\u05D5\u05D3\u05E9",
    price: 350,
    desc: "\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D7\u05D5\u05E4\u05E9\u05D9\u05EA \u05D1\u05DB\u05DC \u05D9\u05DE\u05D5\u05EA \u05D4\u05D7\u05D5\u05D3\u05E9, \u05D1\u05E7\u05E6\u05D1 \u05E9\u05DC\u05DB\u05DD.",
    features: ["כניסה חופשית לבריכה כל החודש", "גישה בכל שעות הפעילות", "ביטול בכל עת, ללא קנס", "הטבות במחירי חוגים"]
  }), /*#__PURE__*/React.createElement(PlanCard, {
    onNav: onNav,
    featured: true,
    badge: "\u05D4\u05DB\u05D9 \u05DE\u05E9\u05EA\u05DC\u05DD",
    icon: "family",
    accent: MAG,
    name: "\u05DE\u05E0\u05D5\u05D9 \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9",
    period: "/ 3 \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD",
    price: 900,
    desc: "\u05E9\u05D7\u05D9\u05D9\u05D4 \u05D7\u05D5\u05E4\u05E9\u05D9\u05EA \u05DC\u05DB\u05DC \u05D4\u05DE\u05E9\u05E4\u05D7\u05D4, \u05D7\u05D9\u05E1\u05DB\u05D5\u05DF \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA\u05D9.",
    features: ["עד 4 בני משפחה במנוי אחד", "שחייה חופשית למשך 3 חודשים", "חיסכון של ₪150 לעומת חודשי", "עדיפות בהרשמה לחוגים חדשים"]
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "56px 24px 16px"
    }
  }, /*#__PURE__*/React.createElement(SectionHead, {
    eyebrow: "\u05D2\u05DE\u05D9\u05E9",
    title: "\u05DB\u05E0\u05D9\u05E1\u05D5\u05EA \u05DC\u05D1\u05E8\u05D9\u05DB\u05D4",
    sub: "\u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05D0\u05D5\u05E8\u05D7\u05D9\u05DD \u05D5\u05DC\u05E9\u05D7\u05D9\u05D9\u05E0\u05D9\u05DD \u05DE\u05D6\u05D3\u05DE\u05E0\u05D9\u05DD",
    color: CYN
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
      alignItems: "stretch"
    }
  }, /*#__PURE__*/React.createElement(PlanCard, {
    onNav: onNav,
    icon: "badge",
    accent: ORG,
    name: "\u05DB\u05E0\u05D9\u05E1\u05D4 \u05D7\u05D3-\u05E4\u05E2\u05DE\u05D9\u05EA",
    price: 45,
    desc: "\u05DB\u05E0\u05D9\u05E1\u05D4 \u05D1\u05D5\u05D3\u05D3\u05EA \u05DC\u05D1\u05E8\u05D9\u05DB\u05D4, \u05DC\u05DC\u05D0 \u05D4\u05EA\u05D7\u05D9\u05D9\u05D1\u05D5\u05EA.",
    features: ["כניסה אחת לבריכה", "ללא מנוי וללא התחייבות", "מושלם לאורחים ולניסיון"]
  }), /*#__PURE__*/React.createElement(PlanCard, {
    onNav: onNav,
    featured: true,
    badge: "\u05D7\u05D9\u05E1\u05DB\u05D5\u05DF \u20AA50",
    icon: "ticket",
    accent: CYN,
    name: "\u05DB\u05E8\u05D8\u05D9\u05E1\u05D9\u05D9\u05D4 \u2014 10 \u05DB\u05E0\u05D9\u05E1\u05D5\u05EA",
    price: 400,
    desc: "\u05E2\u05E9\u05E8 \u05DB\u05E0\u05D9\u05E1\u05D5\u05EA \u05D1\u05EA\u05D5\u05E7\u05E3 \u05DC\u05E9\u05E0\u05D4 \u05E9\u05DC\u05DE\u05D4.",
    features: ["10 כניסות לבריכה", "תוקף לשנה מיום הרכישה", "חיסכון של ₪50", "ניתן לשיתוף בין בני המשפחה"]
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "40px 24px 72px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
      borderRadius: 24,
      border: "1px solid var(--ink-100)",
      background: "var(--brand-gradient-soft)",
      padding: "28px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 22,
      fontWeight: 800,
      color: "var(--ink-900)"
    }
  }, "\u05DC\u05D0 \u05D1\u05D8\u05D5\u05D7\u05D9\u05DD \u05DE\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DB\u05DD?"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "4px 0 0",
      color: "var(--ink-600)"
    }
  }, "\u05E4\u05EA\u05D7\u05D5 \u05D7\u05E9\u05D1\u05D5\u05DF \u05D1\u05D7\u05D9\u05E0\u05DD \u2014 \u05EA\u05D5\u05DB\u05DC\u05D5 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DE\u05E1\u05DC\u05D5\u05DC \u05D0\u05D5 \u05DB\u05E0\u05D9\u05E1\u05D4 \u05D1\u05DB\u05DC \u05E8\u05D2\u05E2.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "hero-cta-primary ah-btn ah-btn--lg",
    onClick: () => onNav("register")
  }, "\u05E4\u05EA\u05D9\u05D7\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "ah-btn ah-btn--lg ah-btn--outline",
    onClick: () => onNav("classes")
  }, "\u05E2\u05D9\u05D5\u05DF \u05D1\u05D7\u05D5\u05D2\u05D9\u05DD")))));
}
window.PublicScreens = {
  HomeScreen,
  ClassesScreen,
  DetailScreen,
  RegisterScreen,
  LoginScreen,
  ProgramsScreen
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/public/screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.BrandLogo = __ds_scope.BrandLogo;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.ButtonLink = __ds_scope.ButtonLink;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.ClassCard = __ds_scope.ClassCard;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.THead = __ds_scope.THead;

__ds_ns.TBody = __ds_scope.TBody;

__ds_ns.TR = __ds_scope.TR;

__ds_ns.TH = __ds_scope.TH;

__ds_ns.TD = __ds_scope.TD;

})();
