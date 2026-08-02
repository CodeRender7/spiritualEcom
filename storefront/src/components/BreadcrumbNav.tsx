import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="breadcrumbs">
      <Link href="/">Home</Link>
      {items.map((item, idx) => (
        <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span className="sep">/</span>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span style={{ color: "var(--text-primary)" }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
