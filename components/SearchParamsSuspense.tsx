import { Suspense } from "react";

export default function SearchParamsSuspense({
  children,
  fallback = <div>Loading...</div>,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
