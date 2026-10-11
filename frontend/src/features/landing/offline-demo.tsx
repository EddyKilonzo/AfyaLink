"use client";

import { CheckCircle2, Clock, CloudOff, FilePlus2, RefreshCw, Server, Smartphone, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EASE_OUT, Reveal } from "@/components/motion";
import { Button } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { Segmented } from "@/components/ui/segmented";

type ItemState = "saved" | "uploading";
interface DemoItem {
  id: number;
  label: string;
  state: ItemState;
}

const LABELS = ["Malaria, 2 cases", "Diarrhoea, 4 cases", "Missed immunisation", "Pneumonia, 1 case", "Malnutrition, 3 cases", "Unsafe water source"];

/**
 * Hands-on version of the offline-first loop. Runs entirely in the browser;
 * nothing is sent anywhere.
 */
export function OfflineDemo() {
  const [online, setOnline] = useState(false);
  const [queue, setQueue] = useState<DemoItem[]>([
    { id: 1, label: LABELS[0] as string, state: "saved" },
    { id: 2, label: LABELS[1] as string, state: "saved" },
  ]);
  const [server, setServer] = useState<{ id: number; label: string }[]>([]);
  const nextId = useRef(3);

  // While online, upload the oldest waiting item, one at a time.
  useEffect(() => {
    if (!online) {
      // Connection dropped mid-upload: that item simply stays saved.
      if (queue.some((i) => i.state === "uploading")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setQueue((q) => q.map((i) => (i.state === "uploading" ? { ...i, state: "saved" } : i)));
      }
      return;
    }
    const head = queue[0];
    if (!head) return;
    if (head.state === "saved") {
      const t = setTimeout(() => setQueue((q) => q.map((i, idx) => (idx === 0 ? { ...i, state: "uploading" } : i))), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setQueue((q) => q.slice(1));
      setServer((s) => [{ id: head.id, label: head.label }, ...s].slice(0, 5));
    }, 1100);
    return () => clearTimeout(t);
  }, [online, queue]);

  function record() {
    const id = nextId.current++;
    setQueue((q) => [...q, { id, label: LABELS[id % LABELS.length] as string, state: "saved" }]);
  }

  return (
    <section className="py-20 sm:py-28" aria-labelledby="offline-demo-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <Reveal>
            <h2 id="offline-demo-title" className="text-h2 text-brand-950">
              Try it: switch the signal off.
            </h2>
            <p className="text-lead mt-4 text-muted">
              Record a few reports while offline. They wait safely on the phone. Turn the connection back on and watch them go, one at a time, each
              confirmed before it leaves the queue.
            </p>
            <p className="mt-4 text-sm text-muted">Interactive demo. Everything happens in your browser; nothing is sent.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Segmented
                label="Connection"
                value={online ? "on" : "off"}
                onChange={(v) => setOnline(v === "on")}
                options={[
                  { value: "off", label: <><CloudOff aria-hidden /> Offline</> },
                  { value: "on", label: <><Wifi aria-hidden /> Online</> },
                ]}
              />
              <Button variant="outline" onClick={record} icon={<FilePlus2 className="size-4" aria-hidden />}>
                Record a report
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="grid gap-4 rounded-[var(--radius-2xl)] bg-sunken p-4 ring-1 ring-inset ring-line sm:grid-cols-2 sm:p-5">
              <Column
                icon={<Smartphone className="size-4" aria-hidden />}
                title="On the phone"
                status={online ? "Uploading when ready" : "Offline, saving locally"}
                tone={online ? "brand" : "amber"}
              >
                <AnimatePresence initial={false}>
                  {queue.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                      className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm shadow-[var(--shadow-ring),var(--shadow-xs)]"
                    >
                      <span className="truncate text-ink">{item.label}</span>
                      <span
                        className={cx(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
                          item.state === "uploading" ? "bg-syncing-bg text-syncing" : "bg-amber-soft text-amber-ink",
                        )}
                      >
                        {item.state === "uploading" ? <RefreshCw className="size-3 animate-spin" aria-hidden /> : <Clock className="size-3" aria-hidden />}
                        {item.state === "uploading" ? "Sending" : "Saved"}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {queue.length === 0 && <li className="py-6 text-center text-sm text-muted">Queue empty. Everything was confirmed.</li>}
              </Column>

              <Column icon={<Server className="size-4" aria-hidden />} title="On the server" status={`${server.length} confirmed`} tone="brand">
                <AnimatePresence initial={false}>
                  {server.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -30, backgroundColor: "rgb(221 245 234)" }}
                      animate={{ opacity: 1, x: 0, backgroundColor: "rgb(255 255 255)" }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm shadow-[var(--shadow-ring),var(--shadow-xs)]"
                    >
                      <span className="truncate text-ink">{item.label}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-synced-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-synced">
                        <CheckCircle2 className="size-3" aria-hidden /> Confirmed
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {server.length === 0 && <li className="py-6 text-center text-sm text-muted">Nothing received yet.</li>}
              </Column>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Column({ icon, title, status, tone, children }: { icon: ReactNode; title: string; status: string; tone: "brand" | "amber"; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          {icon} {title}
        </p>
        <p className={cx("text-xs font-medium", tone === "amber" ? "text-amber-ink" : "text-muted")} aria-live="polite">
          {status}
        </p>
      </div>
      <ul className="min-h-56 space-y-2">{children}</ul>
    </div>
  );
}
