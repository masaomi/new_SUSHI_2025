"use client";

// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// New landing page component that redirects
export default function Help() {
  // const router = useRouter();

  // Show loading screen during redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Hello from the Help page</p>
        <p className="mt-2 text-gray-600">Nothing will happen...</p>
      </div>
    </div>
  );
}
