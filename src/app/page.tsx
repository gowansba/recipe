"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Welcome to your Recipe Book</h1>
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg">
                Create a new Recipe <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link href="/create/manual">Manual Input</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/create/photo">Upload Photo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/create/ai-text">Help with AI (Text Input)</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/book">
            <Button size="lg" variant="outline">View your Recipe Book</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}