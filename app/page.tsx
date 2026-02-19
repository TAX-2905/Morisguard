"use client";
import { useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  memo,
} from "react";
import { 
  Wand2, XCircle, Loader2, ShieldCheck, ShieldAlert, 
  AlertCircle, BookA, Bot, Sparkles, Languages 
} from "lucide-react";
import type { AnalysisResult } from "@/app/lib/schema";

// UI Labels
const OVERALL_LABELS: Record<string, string> = {
  safe: "An sekirite",
  human_review: "Bizin verifikasyon imin",
  unsafe: "Pa an sekirite",
};

const ANALYZE_TIMEOUT_MS = 20000;

function mergeSignals(...signals: (AbortSignal | null | undefined)[]) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signals.filter(Boolean).forEach((s) => s!.addEventListener("abort", onAbort, { once: true }));
  return {
    signal: ctrl.signal,
    cleanup() {
      signals.filter(Boolean).forEach((s) => s!.removeEventListener("abort", onAbort));
    },
  };
}

// Sub-component for the 3 individual cards
const LayerCard = memo(function LayerCard({
  title,
  icon: Icon,
  status,
  details
}: {
  title: string;
  icon: React.ElementType;
  status?: "safe" | "unsafe" | "skipped";
  details?: string;
}) {
  let badgeStyle = "bg-zinc-100 text-zinc-500";
  let statusText = "An atant";

  if (status === "unsafe") {
    badgeStyle = "bg-rose-100 text-rose-700";
    statusText = "Toxic";
  } else if (status === "safe") {
    badgeStyle = "bg-emerald-100 text-emerald-700";
    statusText = "Safe";
  } else if (status === "skipped") {
    badgeStyle = "bg-zinc-100 text-zinc-500";
    statusText = "Skipped";
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-white/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 font-medium text-zinc-900">
          <Icon size={18} className="text-zinc-500" />
          {title}
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${badgeStyle}`}>
          {statusText}
        </span>
      </div>
      {details && (
        <div className="mt-auto pt-3 border-t border-black/20 text-sm text-zinc-800">
          {details}
        </div>
      )}
    </div>
  );
});

function AnalysisContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [, startTransition] = useTransition();

  const lastAnalyzedTextRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const autoSize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, Math.floor(window.innerHeight * 0.85)) + "px";
  }, []);

  useLayoutEffect(() => {
    autoSize(taRef.current);
  }, [autoSize, text]);

  const postAnalyze = useCallback(
    async (payloadText: string, externalController?: AbortController) => {
      const timeoutCtrl = new AbortController();
      const timer = setTimeout(() => timeoutCtrl.abort(), ANALYZE_TIMEOUT_MS);
      const { signal, cleanup } = mergeSignals(externalController?.signal, timeoutCtrl.signal);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payloadText }),
          signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Erer API ${res.status}`);
        return await res.json() as AnalysisResult;
      } finally {
        clearTimeout(timer);
        cleanup();
      }
    },
    []
  );

  const analyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await postAnalyze(text, controller);
      startTransition(() => {
        setResult(data);
        lastAnalyzedTextRef.current = text;
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message ? String(e.message) : "Erer inatandu pandan analiz");
      }
    } finally {
      setLoading(false);
    }
  }, [postAnalyze, text]);

  useEffect(() => {
    const textFromUrl = searchParams.get("text");
    if (textFromUrl) {
      setText(textFromUrl);
      setLoading(true);
      postAnalyze(textFromUrl)
        .then((data) => setResult(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, postAnalyze]); 

  const resetAll = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setText("");
    setResult(null);
    setError(null);
    lastAnalyzedTextRef.current = null;
  }, []);

  useEffect(() => {
    if (!lastAnalyzedTextRef.current || text === lastAnalyzedTextRef.current) return;
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
    setResult(null);
    setError(null);
    lastAnalyzedTextRef.current = null;
  }, [text]);
  
  useEffect(() => {
    if (!lastAnalyzedTextRef.current || text === lastAnalyzedTextRef.current) return;
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
    setResult(null);
    setError(null);
    lastAnalyzedTextRef.current = null;
  }, [text]);


  useEffect(() => {
    if (result && !loading) {
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [result, loading]);

  const pillStyle = useMemo(() => {
    if (!result) return "bg-white/50 border-zinc-200 text-zinc-500"; 
    if (result.overall_label === "unsafe") return "bg-white/80 border-rose-200 text-rose-800 shadow-sm";
    if (result.overall_label === "human_review") return "bg-white/80 border-amber-200 text-amber-800 shadow-sm";
    return "bg-white/80 border-emerald-200 text-emerald-800 shadow-sm";
  }, [result]);

  // DYNAMIC BACKGROUND CONTROL FOR THE ENTIRE PAGE
  const mainBgStyle = useMemo(() => {
    if (!result) return "bg-zinc-100"; 
    if (result.overall_label === "unsafe") return "bg-rose-200"; 
    if (result.overall_label === "human_review") return "bg-orange-100"; 
    return "bg-emerald-100"; 
  }, [result]);

  const MainIcon = !result ? ShieldCheck : result.overall_label === "unsafe" ? ShieldAlert : result.overall_label === "human_review" ? AlertCircle : ShieldCheck;

  return (
    <main className={`min-h-dvh transition-colors duration-700 ease-in-out ${mainBgStyle}`}>
      <div className="mx-auto max-w-5xl px-6 py-14">
        
        <header className="text-center mb-8">
          <img src="/logo.png" alt="Brand logo" className="h-25 w-auto mx-auto object-contain" />
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">MorisGuard</h1>
        </header>

        {/* ROW 1: Textarea (Left) + General Feedback & Language (Right) */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          
          {/* Textbox Section */}
          <section className="flex-1 rounded-3xl border border-zinc-200 bg-white/80 backdrop-blur shadow-sm p-6 transition-all duration-300">
            <label htmlFor="input" className="block text-sm font-medium text-zinc-700 mb-2">
              Paragraph
            </label>
            <textarea
              id="input"
              ref={taRef}
              value={text}
              onInput={useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
              const target = e.target as HTMLTextAreaElement; // Cast for safety
              setText(target.value);
              autoSize(e.currentTarget);
              }, [autoSize])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim() && !loading) analyze();
                }
              }}
              placeholder="Met 1 text ici pou analizer…"
              className="w-full h-auto min-h-[12vh] rounded-2xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900/10 focus:outline-none p-4 bg-white/50 text-[16px] leading-7 resize-none"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={analyze}
                disabled={loading || !text.trim()}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 text-white px-5 py-3 text-base font-medium shadow hover:bg-black disabled:opacity-40 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                {loading ? "Pe analiz…" : "Analize"}
              </button>

              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-2xl bg-white border border-zinc-200 px-4 py-3 text-sm hover:bg-zinc-50 transition-all"
              >
                <XCircle size={16} /> Reffacer
              </button>
            </div>
          </section>

          {/* RIGHT COLUMN: Feedback General + Language Detected */}
          <div className="w-full md:w-72 shrink-0 flex flex-col gap-4">
            
            {/* 1. Smaller Feedback General Section */}
            <section className={`flex-1 rounded-3xl border flex flex-col items-center justify-center p-5 text-center transition-all duration-700 backdrop-blur-sm shadow-sm ${pillStyle}`}>
              <div className="flex items-center gap-2 mb-2 opacity-80">
                <MainIcon size={20} />
                <span className="text-xs font-semibold uppercase tracking-wider">Feedback Zeneral</span>
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {result ? OVERALL_LABELS[result.overall_label] : "---"}
              </div>
              {!result && !loading && (
                <p className="mt-2 text-xs font-medium opacity-60">
                  Lance enn analiz pou afis rezilta
                </p>
              )}
            </section>

            {/* 2. New Language Detected Section */}
            <section className="rounded-3xl border border-zinc-200 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-zinc-500">
                <Languages size={18} />
                <span className="text-xs font-semibold uppercase tracking-wider">Langaz Detekte</span>
              </div>
              <div className="text-xl font-bold text-zinc-800 capitalize">
                {result && result.detected_language 
                  ? (result.detected_language === 'creole' ? 'Kreol' 
                    : result.detected_language === 'french' ? 'Francais' 
                    : result.detected_language === 'english' ? 'Anglais' 
                    : result.detected_language)
                  : "---"}
              </div>
            </section>
            
          </div>

        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-start gap-2 mb-6 shadow-sm">
            <XCircle className="mt-0.5" size={18} /> {error}
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* ROW 2: Reason for Toxicity (Only shown if toxic/has explanation or ML flagged it) */}
            {(result.dictionary_match || result.gemini_explanation || (result.model_result === "unsafe" && result.gemini_result === "safe")) && result.overall_label !== "safe" && (
              <section className="mb-6 rounded-3xl border border-rose-200 bg-white/60 backdrop-blur-sm p-6 shadow-sm">
                <h3 className="text-base font-bold text-rose-900 mb-2 flex items-center gap-2">
                  <AlertCircle size={18} /> Detay lor Analiz
                </h3>
                <p className="text-rose-800 leading-relaxed">
				{result.dictionary_match 
                    ? `Diksioner inn detekte enn ou plizir mot interdi: ${result.matched_words?.join(", ")}.` 
                    : result.overall_label === "human_review"
                    ? "Model ML inn detekte enn form toksisite, me Gemini AI pan trouv nanien mal. Bizin enn imin pou pran desizion final."
                    : result.gemini_result === "unsafe" && result.gemini_explanation
                    ? result.gemini_explanation
                    : "Text la pa an sekirite."}
                </p>
              </section>
            )}

            {/* ROW 3: The 3 Layer Cards Side-by-Side */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <LayerCard 
                title="Diksioner" 
                icon={BookA} 
                status={result.dictionary_match ? "unsafe" : "safe"} 
                details={result.dictionary_match && result.matched_words ? `Mot: ${result.matched_words.join(", ")}` : "Auken mot interdi detekte"}
              />

              <LayerCard 
                title="Model ML" 
                icon={Bot} 
                status={result.dictionary_match ? "skipped" : result.model_result || "safe"} 
                details={
                  result.dictionary_match 
                    ? "Model in ignore akoz diksioner in blok li avan." 
                    : result.model_result === "skipped"
                    ? `Ignore: Langaz ${result.detected_language === 'english' ? 'Angle' : 'Franse'} detekte. Zis Gemini in servi.`
                    : "Rezilta depi MorisGuard Model."
                }
              />

              <LayerCard 
                title="Gemini AI" 
                icon={Sparkles} 
                status={result.dictionary_match ? "skipped" : result.gemini_result || "safe"} 
                details={result.dictionary_match ? "Gemini in ignore akoz diksioner in blok li avan." : "Analiz LLM."}
              />

            </section>
          </div>
        )}

        <footer className="mt-14 border-t border-black/20 pt-6 text-center text-sm text-zinc-600 font-medium">
          LOMESH — All Right Reserved
        </footer>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}