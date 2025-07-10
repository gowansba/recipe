"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import Image from 'next/image'; // Import Image component
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import Tesseract from 'tesseract.js';
import { parseRecipeWithAI, ParsedRecipe } from '@/lib/ai-parser';

export default function UploadPhotoPage() {
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [parsedRecipeDraft, setParsedRecipeDraft] = useState<ParsedRecipe | null>(null);
  const [ocrText, setOcrText] = useState<string>(""); // Re-added for raw OCR display
  const [loading, setLoading] = useState<boolean>(false);
  const [stage, setStage] = useState<"upload" | "preview">("upload");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setImages(filesArray);
      const previews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleProcessImages = async () => {
    setLoading(true);
    let fullOcrText = "";
    for (const image of images) {
      const { data: { text } } = await Tesseract.recognize(
        image,
        'eng',
        { logger: m => console.log(m) }
      );
      fullOcrText += text + "\n\n";
    }
    setOcrText(fullOcrText); // Set raw OCR text
    const parsed = await parseRecipeWithAI(fullOcrText);
    setParsedRecipeDraft(parsed);
    console.log("Parsed Recipe Draft after AI parsing:", parsed);
    setLoading(false);
    setStage("preview");
  };

  const router = useRouter();

  const handleDiscard = () => {
    setShowDiscardDialog(true);
  };

  const confirmDiscard = () => {
    router.push("/");
  };

  const handleEditManually = () => {
    console.log("Parsed recipe draft being saved to localStorage for manual edit:", parsedRecipeDraft);
    localStorage.setItem("draftRecipe", JSON.stringify(parsedRecipeDraft));
    router.push("/create/manual");
  };

  const handleReviseWithAI = async () => {
    alert("AI revision is coming soon!");
    console.log("Revising with AI:", ocrText); // Use ocrText for AI revision
  };

  const handlePublish = () => {
    const existingRecipes = JSON.parse(localStorage.getItem("allRecipes") || "[]");
    localStorage.setItem("allRecipes", JSON.stringify([...existingRecipes, parsedRecipeDraft]));

    alert("Recipe published to your recipe book!");
    router.push("/book");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Upload Recipe Photo</CardTitle>
          <CardDescription>
            {stage === "upload"
              ? "Upload photos of your recipe to automatically extract ingredients and instructions."
              : "Review the extracted text and choose your next step."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stage === "upload" && (
            <div className="flex flex-col items-center gap-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-violet-50 file:text-violet-700
                  hover:file:bg-violet-100"
              />
              <div className="grid grid-cols-2 gap-4 mt-4">
                {imagePreviews.map((src, index) => (
                  <Image key={index} src={src} alt={`Preview ${index}`} width={200} height={200} className="w-full h-auto rounded-md shadow-sm" />
                ))}
              </div>
              <Button
                onClick={handleProcessImages}
                disabled={images.length === 0 || loading}
                className="w-full"
              >
                {loading ? "Processing..." : "Process Images"}
              </Button>
            </div>
          )}

          {stage === "preview" && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold">Extracted Text Draft:</h3>
              <Textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleEditManually}>Edit Manually</Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleReviseWithAI}>
                        Revise with AI
                        <Info className="ml-2 h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>AI will help revise the recipe for best readability and scanning when making the recipe.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button onClick={handlePublish}>Publish to Recipe Book</Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardDescription className="p-6 pt-0 flex justify-between items-center">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          <Button variant="outline" onClick={handleDiscard}>Discard</Button>
        </CardDescription>
      </Card>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Recipe?</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard this recipe? All unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDiscard}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}