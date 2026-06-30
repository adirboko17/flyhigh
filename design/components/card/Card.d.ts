import React from "react";

/**
 * White surface container with a soft cool shadow and 20px radius. Compose with
 * `CardHeader` / `CardTitle` / `CardContent` / `CardFooter`.
 *
 * @example
 * <Card>
 *   <CardHeader><CardTitle>הרשמות אחרונות</CardTitle></CardHeader>
 *   <CardContent>…</CardContent>
 * </Card>
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export declare function Card(props: CardProps): JSX.Element;
export declare function CardHeader(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
export declare function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element;
export declare function CardContent(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
export declare function CardFooter(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
