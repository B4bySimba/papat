import Link from "next/link";

/** A property or unit name that opens its page; stops the click so the table row's own sheet stays shut. */
export default function PlaceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={(e) => e.stopPropagation()} className="font-medium text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
