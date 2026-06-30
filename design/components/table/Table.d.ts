import React from "react";

/**
 * Right-aligned data table with an uppercase grey header, hairline row dividers,
 * and a subtle hover highlight. Horizontally scrolls on narrow screens.
 *
 * @example
 * <Table>
 *   <THead><TR><TH>שם החוג</TH><TH>מדריכה</TH><TH>סטטוס</TH></TR></THead>
 *   <TBody>
 *     <TR><TD>שחייה לילדים</TD><TD>דנה כהן</TD><TD><Badge tone="success">פעיל</Badge></TD></TR>
 *   </TBody>
 * </Table>
 */
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}
export declare function Table(props: TableProps): JSX.Element;
export declare function THead(props: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element;
export declare function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element;
export declare function TR(props: React.HTMLAttributes<HTMLTableRowElement>): JSX.Element;
export declare function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element;
export declare function TD(props: React.TdHTMLAttributes<HTMLTableCellElement>): JSX.Element;
