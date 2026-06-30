import React from "react";

export function Card({ className = "", children, ...props }) {
  return <div className={["ah-card", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
export function CardHeader({ className = "", children, ...props }) {
  return <div className={["ah-card__header", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
export function CardTitle({ className = "", children, ...props }) {
  return <h3 className={["ah-card__title", className].filter(Boolean).join(" ")} {...props}>{children}</h3>;
}
export function CardContent({ className = "", children, ...props }) {
  return <div className={["ah-card__content", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
export function CardFooter({ className = "", children, ...props }) {
  return <div className={["ah-card__footer", className].filter(Boolean).join(" ")} {...props}>{children}</div>;
}
