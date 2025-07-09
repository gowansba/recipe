"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Welcome to your Recipe Book</h1>
        <div className="flex gap-4">
          <Link href="/create">
            <Button size="lg">Create a new Recipe</Button>
          </Link>
          <Link href="/book">
            <Button size="lg" variant="outline">View your Recipe Book</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}