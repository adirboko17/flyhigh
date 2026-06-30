import React from "react";

export function Table({ className = "", children, ...props }) {
  return (
    <div className="ah-table-wrap">
      <table className={["ah-table", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </table>
    </div>
  );
}
export function THead({ children, ...props }) { return <thead {...props}>{children}</thead>; }
export function TBody({ children, ...props }) { return <tbody {...props}>{children}</tbody>; }
export function TR({ children, ...props }) { return <tr {...props}>{children}</tr>; }
export function TH({ children, ...props }) { return <th {...props}>{children}</th>; }
export function TD({ className = "", children, ...props }) {
  return <td className={className} {...props}>{children}</td>;
}
