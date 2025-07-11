"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Import supabase client dynamically to avoid SSR issues
    const loadSupabase = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            router.push("/"); // Redirect to home on successful login
          }
        });
        
        setSupabaseLoaded(true);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Failed to load Supabase:', error);
      }
    };

    loadSupabase();
  }, [router]);

  const handleSignUp = async () => {
    if (!supabaseLoaded) {
      alert("Please wait, loading...");
      return;
    }
    
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert("Error signing up: " + error.message);
      } else {
        alert("Sign up successful! Please check your email to confirm your account.");
      }
    } catch (error) {
      console.error('Error during sign up:', error);
      alert("An error occurred during sign up.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!supabaseLoaded) {
      alert("Please wait, loading...");
      return;
    }
    
    setLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("Error signing in: " + error.message);
      } else {
        // Redirect is handled by onAuthStateChange
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      alert("An error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-center">Login to Recipe Book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleSignIn} disabled={loading || !supabaseLoaded} className="w-full">
            {loading ? "Signing In..." : "Sign In"}
          </Button>
          <Button onClick={handleSignUp} disabled={loading || !supabaseLoaded} variant="outline" className="w-full">
            {loading ? "Signing Up..." : "Sign Up"}
          </Button>
          {!supabaseLoaded && (
            <p className="text-center text-sm text-gray-500">Loading...</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}