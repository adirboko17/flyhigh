export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  children,
  ...props
}) {
  const cls = [
    "ah-btn",
    `ah-btn--${variant}`,
    `ah-btn--${size}`,
    block ? "ah-btn--block" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  href = "#",
  className = "",
  children,
  ...props
}) {
  const cls = [
    "ah-btn",
    `ah-btn--${variant}`,
    `ah-btn--${size}`,
    block ? "ah-btn--block" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <a className={cls} href={href} {...props}>
      {children}
    </a>
  );
}
