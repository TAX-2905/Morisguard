// app/api/report/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST(req: Request) {
  try {
    const { text, original_label, suggested_label, language } = await req.json();

    const { error } = await supabase.from('misclassifications').insert([{
      text_content: text,
      original_label: original_label,
      user_suggested_label: suggested_label,
      detected_language: language
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}